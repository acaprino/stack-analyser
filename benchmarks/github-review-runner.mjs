// Run both compiled CLIs on immutable GitHub snapshots, without running repository code.
// node benchmarks/github-review-runner.mjs BASE CANDIDATE SNAPSHOTS PROJECTS.json REPORT.json
// A snapshot lives at SNAPSHOTS/owner--repo. PROJECTS.json contains {repo,commit,tree,fileCount,
// expected:[{id,path,present?,kind?,scope?,owner?,needle?,blob?,host?,line?,role?}]} records.
// Optional files:[{path,sha,size,mode}] lists every regular file/symlink in the materialized snapshot.
// When all modes are supplied, the Git tree hash must also match the remote commit's tree.
// Scope defaults to project. For manifest scope, the CLI component must list owner (default path).
// kind defaults to tech; mention expects same-file endpoint evidence. An unlabeled hit is unjudged.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, mkdir, mkdtemp, open, readdir, readFile, readlink, realpath, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { jobs: { type: 'string', default: '4' }, 'timeout-ms': { type: 'string', default: '120000' },
    'raw-dir': { type: 'string' } },
});
if (positionals.length !== 5) throw new Error('Expected BASE CANDIDATE SNAPSHOTS PROJECTS.json REPORT.json');
const [baseRoot, candidateRoot, snapshotsRoot, manifestPath, outputPath] = positionals.map((arg) => resolve(arg));
const jobs = Number(values.jobs), timeout = Number(values['timeout-ms']);
if (!Number.isInteger(jobs) || jobs < 1 || jobs > 32 || !Number.isSafeInteger(timeout) || timeout < 1) {
  throw new Error('Expected 1–32 jobs and a positive timeout in milliseconds');
}

const sha = /^[a-f0-9]{40}$/;
const componentPath = (value) => value.replaceAll('\\', '/').replace(/^\/+/, '');
const sorted = (set) => [...set].sort();
function within(root, file) {
  const rel = relative(root, file);
  return !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep);
}
function repoPath(path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.includes(':') ||
      path.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Invalid repository path: ${path}`);
  }
  return path;
}

async function fileHash(path, size, git) {
  const hash = createHash(git ? 'sha1' : 'sha256');
  if (git) hash.update(`blob ${size}\0`);
  for await (const part of createReadStream(path)) hash.update(part);
  return hash.digest('hex');
}

// Read links as Git blobs. Only an inert, self-contained checkout may reach a CLI under test.
async function inventory(root) {
  const paths = new Map();
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const path = join(directory, entry.name);
      const name = relative(root, path).split(sep).join('/');
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        const { size } = await lstat(path);
        paths.set(name, { size, sha: await fileHash(path, size, true), link: false });
      } else if (entry.isSymbolicLink()) {
        const target = await readlink(path);
        const link = resolve(directory, target);
        if (!within(root, link) || !within(root, await realpath(path))) {
          throw new Error(`Link leaves checkout: ${name}`);
        }
        const bytes = Buffer.from(target);
        const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
        paths.set(name, { sha: hash, size: bytes.length, link: true });
      } else {
        throw new Error(`Unsupported filesystem entry: ${name}`);
      }
    }
  }
  await visit(root);
  return paths;
}

function gitTree(files) {
  const root = new Map();
  for (const file of files) {
    if (!['100644', '100755', '120000'].includes(file.mode)) throw new Error(`Unsupported Git mode: ${file.path}`);
    const parts = file.path.split('/');
    const name = parts.pop();
    let parent = root;
    for (const part of parts) {
      if (!parent.has(part)) parent.set(part, new Map());
      parent = parent.get(part);
    }
    parent.set(name, file);
  }
  function hashDir(entries) {
    const contents = [...entries].map(([name, entry]) => {
      const dir = entry instanceof Map;
      const header = Buffer.from((dir ? '40000' : entry.mode) + ' ' + name + '\0');
      return { sortKey: Buffer.from(name + (dir ? '/' : '')),
        bytes: Buffer.concat([header, dir ? hashDir(entry) : Buffer.from(entry.sha, 'hex')]) };
    });
    contents.sort((a, b) => Buffer.compare(a.sortKey, b.sortKey));
    const bytes = Buffer.concat(contents.map((item) => item.bytes));
    return createHash('sha1').update(`tree ${bytes.length}\0`).update(bytes).digest();
  }
  return hashDir(root).toString('hex');
}

async function snapshot(project, root) {
  const paths = await inventory(root);
  if (!paths.size) throw new Error('Empty snapshot');
  if (project.fileCount !== undefined && project.fileCount !== paths.size) {
    throw new Error(`Expected ${project.fileCount} files, found ${paths.size}`);
  }
  let verifiedTree = false;
  if (project.files) {
    const checked = new Set();
    for (const file of project.files) {
      const path = repoPath(file.path), actual = paths.get(path);
      if (checked.has(path) || !actual || actual.sha !== file.sha || (file.mode && actual.link !== (file.mode === '120000')) ||
          (file.size !== undefined && actual.size !== file.size)) throw new Error(`Git blob mismatch: ${path}`);
      checked.add(path);
    }
    if (checked.size !== paths.size) throw new Error('Snapshot has unlisted files');
    if (project.tree && project.files.every((f) => f.mode)) {
      if (gitTree(project.files) !== project.tree) throw new Error('Git tree mismatch: missing or modified entries');
      verifiedTree = true;
    }
  }
  const hash = createHash('sha256');
  for (const path of sorted(paths.keys())) hash.update(path + '\0' + paths.get(path).sha + '\0');
  return { paths, summary: { files: paths.size, sha256: hash.digest('hex'),
    verifiedBlobList: Boolean(project.files), verifiedTree } };
}

async function labels(project, root, paths) {
  if (!Array.isArray(project.expected)) throw new Error('Missing expected array');
  const cases = [], identities = new Map();
  for (const item of project.expected) {
    const { id, kind = 'tech', present = true, scope = 'project' } = item;
    const path = repoPath(item.path);
    if (!id || typeof id !== 'string' || typeof present !== 'boolean' || !['tech', 'mention'].includes(kind) ||
        !['project', 'manifest'].includes(scope)) throw new Error(`Malformed expectation at ${path}`);
    if (!paths.has(path) || (item.blob && paths.get(path).sha !== item.blob)) {
      throw new Error(`Missing or changed evidence: ${path}`);
    }
    if (item.needle !== undefined && (typeof item.needle !== 'string' || !item.needle ||
        !(await readFile(join(root, path), 'utf8')).includes(item.needle))) {
      throw new Error(`Cannot reproduce evidence text in ${path} for ${id}`);
    }
    const owner = item.owner ? repoPath(item.owner) : scope === 'manifest' ? path : undefined;
    if (owner && !paths.has(owner)) throw new Error(`Missing owner: ${owner}`);
    const key = JSON.stringify([id, kind, owner ?? '', kind === 'mention' ? [path, item.host, item.line] : '']);
    if (identities.has(key)) {
      if (identities.get(key) !== present) throw new Error(`Contradictory labels for ${id}`);
      continue;
    }
    identities.set(key, present);
    cases.push({ id, kind, present, path, scope: owner ? 'manifest' : scope, owner, host: item.host,
      line: item.line, role: item.role, ecosystem: item.ecosystem, evidence: item.evidence,
      note: item.note, blob: paths.get(path).sha });
  }
  return cases;
}

function analyzeGraph(graph) {
  const techs = new Set(), owners = new Map(), mentions = [], dependencies = new Set(), languages = new Set();
  let nodes = 0;
  function visit(node) {
    if (!Array.isArray(node.techs) || !Array.isArray(node.path) || !Array.isArray(node.childs)) {
      throw new Error('Malformed CLI graph');
    }
    nodes++;
    const ids = [...node.techs, ...(node.tech ? [node.tech] : [])];
    for (const id of ids) techs.add(id);
    const nodePaths = new Set(node.path.map(componentPath));
    for (const path of nodePaths) {
      if (!owners.has(path)) owners.set(path, { definite: new Set(), merged: new Set() });
      const owner = owners.get(path);
      // A merged component returns the union of technologies from multiple paths.
      // The same ID on another unmerged node can still establish ownership.
      const observations = nodePaths.size === 1 ? owner.definite : owner.merged;
      for (const id of ids) observations.add(id);
    }
    for (const mention of node.mentions ?? []) mentions.push(mention);
    for (const dep of node.dependencies ?? []) dependencies.add(JSON.stringify(dep));
    for (const language of Object.keys(node.languages ?? {})) languages.add(language);
    node.childs.forEach(visit);
  }
  visit(graph);
  return { techs, owners, mentions, observations: { nodes, techs: sorted(techs), mentions: sorted(new Set(
    mentions.map((m) => m.tech))), dependencies: dependencies.size, languages: sorted(languages) } };
}

function score(item, result) {
  if (!result.graph) return 'unscored';
  const { techs, mentions, owners } = result.graph;
  let found;
  if (item.kind === 'mention') {
    found = mentions.some((m) => m.tech === item.id && componentPath(m.path) === item.path &&
      (!item.host || m.host === item.host) && (item.line === undefined || m.line === item.line));
  } else if (item.owner) {
    const owner = owners.get(item.owner);
    if (!owner && !item.present) return 'unscored';
    found = owner?.definite.has(item.id) ?? false;
    if (!found && owner?.merged.has(item.id)) return 'unscored';
  } else {
    found = techs.has(item.id);
  }
  return item.present ? (found ? 'tp' : 'fn') : (found ? 'fp' : 'tn');
}

async function run(cli, root, raw) {
  await mkdir(raw);
  const log = await open(join(raw, 'cli.log'), 'w');
  const started = Date.now();
  let timedOut = false;
  try {
    await new Promise((done, fail) => {
      const child = spawn(process.execPath, [cli, root, '--output=stack.json'], {
        cwd: raw, windowsHide: true, stdio: ['ignore', log.fd, log.fd],
      });
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeout);
      child.once('error', (error) => { clearTimeout(timer); fail(error); });
      child.once('close', (code, signal) => {
        clearTimeout(timer);
        if (code === 0 && !timedOut) done();
        else fail(new Error(timedOut ? 'timeout' : `CLI exited ${code ?? signal}`));
      });
    });
    const graph = analyzeGraph(JSON.parse(await readFile(join(raw, 'stack.json'), 'utf8')));
    return { graph, summary: { status: 'ok', elapsedMs: Date.now() - started, ...graph.observations } };
  } catch (error) {
    return { summary: { status: 'error', error: error.message, elapsedMs: Date.now() - started } };
  } finally {
    await log.close();
  }
}

async function fingerprint(root) {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const dist = join(root, 'dist'), hash = createHash('sha256');
  const files = (await readdir(dist, { recursive: true })).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'));
  for (const path of sorted(files)) {
    hash.update(path.split(sep).join('/') + '\0' + await fileHash(join(dist, path), 0, false) + '\0');
  }
  await lstat(join(dist, 'cli.js'));
  return { name: pkg.name, version: pkg.version, javascriptFiles: files.length, sha256: hash.digest('hex') };
}

const manifestBytes = await readFile(manifestPath);
const projects = JSON.parse(manifestBytes);
if (!Array.isArray(projects) || !projects.length) throw new Error('No projects in manifest');
const seen = new Set();
for (const project of projects) {
  const folder = String(project.repo).replace('/', '--').toLowerCase();
  if (typeof project.repo !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(project.repo) ||
      project.repo.split('/').some((part) => part === '.' || part === '..') || seen.has(folder) ||
      !sha.test(project.commit) || (project.tree !== undefined && !sha.test(project.tree))) {
    throw new Error(`Duplicate or invalid pinned project: ${project.repo}`);
  }
  seen.add(folder);
}
const rawParent = values['raw-dir'] ? resolve(values['raw-dir']) : join(dirname(snapshotsRoot), 'review-runs');
if (within(snapshotsRoot, rawParent) || within(snapshotsRoot, outputPath)) {
  throw new Error('Raw graphs and report must stay outside the input snapshots');
}
await mkdir(rawParent, { recursive: true });
const rawDir = await mkdtemp(join(rawParent, 'run-'));
const builds = await Promise.all([baseRoot, candidateRoot].map(fingerprint));
const reports = Array(projects.length);
let next = 0, completed = 0;
async function worker() {
  while (next < projects.length) {
    const index = next++, project = projects[index], name = project.repo.replace('/', '--');
    const row = { repo: project.repo, commit: project.commit, tree: project.tree, language: project.language, split: project.split };
    try {
      const root = await realpath(join(snapshotsRoot, name));
      if (dirname(root) !== await realpath(snapshotsRoot)) throw new Error('Checkout must be a direct child of snapshot root');
      const { paths, summary } = await snapshot(project, root);
      row.snapshot = summary;
      const cases = await labels(project, root, paths);
      const work = join(rawDir, name);
      await mkdir(work);
      const baseline = await run(join(baseRoot, 'dist/cli.js'), root, join(work, 'baseline'));
      const candidate = await run(join(candidateRoot, 'dist/cli.js'), root, join(work, 'candidate'));
      row.baseline = baseline.summary;
      row.candidate = candidate.summary;
      row.cases = cases.map((item) => ({ ...item, baseline: score(item, baseline), candidate: score(item, candidate) }));
      if (baseline.graph && candidate.graph) {
        row.gained = sorted([...candidate.graph.techs].filter((id) => !baseline.graph.techs.has(id)));
        row.lost = sorted([...baseline.graph.techs].filter((id) => !candidate.graph.techs.has(id)));
      }
    } catch (error) {
      row.error = error.message;
    }
    reports[index] = row;
    if (++completed % 10 === 0 || completed === projects.length) console.error(`Completed ${completed}/${projects.length}`);
  }
}
await Promise.all(Array.from({ length: Math.min(jobs, projects.length) }, worker));
const afterBuilds = await Promise.all([baseRoot, candidateRoot].map(fingerprint));
if (builds.some((build, index) => build.sha256 !== afterBuilds[index].sha256)) throw new Error('A CLI build changed during the run');
const paired = reports.filter((r) => r.baseline?.status === 'ok' && r.candidate?.status === 'ok');
function outcomes(side, kind) {
  const totals = { tp: 0, fn: 0, fp: 0, tn: 0, unscored: 0 };
  for (const row of paired) for (const item of row.cases) if (item.kind === kind) totals[item[side]]++;
  return totals;
}
const summary = { projects: reports.length, paired: paired.length, labeled: paired.filter((r) => r.cases.length).length,
  files: paired.reduce((sum, r) => sum + r.snapshot.files, 0), technologies: {}, mentions: {} };
for (const side of ['baseline', 'candidate']) {
  summary.technologies[side] = outcomes(side, 'tech');
  summary.mentions[side] = outcomes(side, 'mention');
}
const report = { schemaVersion: 1, node: process.version, jobs, timeoutMs: timeout, manifest: basename(manifestPath),
  manifestSha256: createHash('sha256').update(manifestBytes).digest('hex'), baselineBuild: builds[0],
  candidateBuild: builds[1], summary, projects: reports };
await mkdir(dirname(outputPath), { recursive: true });
const pending = outputPath + '.' + process.pid + '.tmp';
await writeFile(pending, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
await rename(pending, outputPath);
console.log(JSON.stringify({ summary, rawDir, report: outputPath }));
if (paired.length !== reports.length) process.exitCode = 1;
