// node benchmarks/github-review-fetch.mjs OUT [PROJECTS.json] [--jobs 4] [--inventory PATH]
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createReadStream, createWriteStream } from 'node:fs';
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parseArgs, promisify } from 'node:util';

const { positionals, values } = parseArgs({
  allowPositionals: true, options: { jobs: { type: 'string', default: '4' }, inventory: { type: 'string' } },
});
const [output, manifest] = positionals;
const jobs = Number(values.jobs);
if (!output || positionals.length > 2 || !Number.isInteger(jobs) || jobs < 1 || jobs > 16) {
  throw new Error('Usage: node github-review-fetch.mjs OUT [PROJECTS.json] [--jobs 1..16] [--inventory PATH]');
}
const projects = JSON.parse(await readFile(manifest ?? new URL('./github-review-projects.json', import.meta.url), 'utf8'));
if (!Array.isArray(projects) || !projects.length) throw new Error('Expected an array of pinned GitHub projects');
const seen = new Set();
const oid = /^[0-9a-f]{40}$/;

// The same snapshot must be representable on Windows, Linux and macOS.
function safePart(part) {
  return !!part && part !== '.' && part !== '..' && part.toLowerCase() !== '.git' &&
    !/[<>:"\\|?*\x00-\x1f]/.test(part) && !/[. ]$/.test(part) &&
    !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part);
}
for (const { repo, commit, tree, fileCount } of projects) {
  if (typeof repo !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(repo) || !repo.split('/').every(safePart) ||
      !oid.test(commit) || !oid.test(tree) || !Number.isSafeInteger(fileCount) || fileCount < 0) {
    throw new Error(`Invalid pin: ${repo}`);
  }
  const key = repo.replace('/', '--').toLowerCase();
  if (seen.has(key)) throw new Error(`Duplicate destination for ${repo}`);
  seen.add(key);
}
const run = promisify(execFile);
const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_NO_REPLACE_OBJECTS: '1' };
const gitOptions = { env, windowsHide: true, maxBuffer: 64 * 1024 * 1024 };
await mkdir(output, { recursive: true });
if (!(await lstat(output)).isDirectory()) throw new Error('Output must be a directory');
const root = await realpath(output);

async function hashStream(entry, stream, destination) {
  const hash = createHash('sha1').update(`blob ${entry.size}\0`);
  let bytes = 0;
  const monitor = new Transform({
    transform(chunk, encoding, done) {
      hash.update(chunk);
      bytes += chunk.length;
      done(null, destination ? chunk : undefined);
    },
  });
  if (destination) {
    await pipeline(stream, monitor, createWriteStream(destination, { flags: 'wx', mode: entry.mode === '100755' ? 0o755 : 0o644 }));
  } else {
    await pipeline(stream, monitor);
  }
  if (bytes !== entry.size || hash.digest('hex') !== entry.sha) throw new Error(`Blob mismatch: ${entry.name}`);
}

function readTree(buffer, fileCount) {
  const files = new Map(), directories = new Set(), canonical = new Map();
  const records = new TextDecoder('utf-8', { fatal: true }).decode(buffer).split('\0');
  if (records.pop() !== '') throw new Error('Incomplete Git tree');
  for (const row of records) {
    const tab = row.indexOf('\t');
    const header = /^(100644|100755) blob ([0-9a-f]{40}) +(\d+)$/.exec(row.slice(0, tab));
    const name = row.slice(tab + 1);
    const parts = name.split('/');
    if (tab < 0 || !header || !parts.every(safePart)) throw new Error(`Unsupported tree entry: ${name}`);
    let prefix = '';
    for (const [index, part] of parts.entries()) {
      prefix = prefix ? prefix + '/' + part : part;
      const key = prefix.normalize('NFC').toLowerCase();
      if (canonical.has(key) && canonical.get(key) !== prefix) throw new Error(`Path collision: ${prefix}`);
      canonical.set(key, prefix);
      if (index < parts.length - 1) directories.add(prefix);
    }
    files.set(name, { name, mode: header[1], sha: header[2], size: Number(header[3]) });
  }
  if (files.size !== fileCount) throw new Error(`Expected ${fileCount} tracked files, found ${files.size}`);
  return { files, directories };
}

async function verifyExisting(base, snapshot) {
  const pending = [''];
  const verified = new Set();
  while (pending.length) {
    const parent = pending.pop();
    for (const file of await readdir(path.join(base, parent), { withFileTypes: true })) {
      const name = parent ? parent + '/' + file.name : file.name;
      if (file.isDirectory() && snapshot.directories.has(name)) pending.push(name);
      else if (file.isFile() && snapshot.files.has(name)) {
        await hashStream(snapshot.files.get(name), createReadStream(path.join(base, name)));
        verified.add(name);
      } else throw new Error(`Existing destination contains an unexpected entry: ${name}`);
    }
  }
  if (verified.size !== snapshot.files.size) throw new Error('Existing destination is incomplete');
}

async function hydrate({ repo, commit, tree, fileCount }) {
  const target = path.join(root, repo.replace('/', '--'));
  const scratch = await mkdtemp(path.join(root, '.github-review-'));
  try {
    const bare = path.join(scratch, 'objects.git');
    const stage = path.join(scratch, 'snapshot');
    const git = (args, options) => run('git', ['--git-dir', bare, ...args], { ...gitOptions, ...options });
    await run('git', ['init', '--bare', '--template=', bare], gitOptions);
    await git(['-c', 'fetch.recurseSubmodules=false', 'fetch', '--quiet', '--no-tags', '--depth=1',
      `https://github.com/${repo}.git`, commit]);
    const refs = await git(['rev-parse', 'FETCH_HEAD^{commit}', 'FETCH_HEAD^{tree}']);
    const [actualCommit, actualTree] = refs.stdout.trim().split(/\r?\n/);
    if (actualCommit !== commit || actualTree !== tree) throw new Error('Immutable Git revision or tree mismatch');
    const listing = await git(['ls-tree', '-rlz', '--full-tree', tree], { encoding: 'buffer' });
    const snapshot = readTree(listing.stdout, fileCount);
    const inventory = values.inventory && { repo, files: [...snapshot.files.values()].map(({ name, ...entry }) => ({ path: name, ...entry })) };
    let existing;
    try { existing = await lstat(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (existing) {
      if (!existing.isDirectory()) throw new Error('Refusing to modify an existing destination');
      await verifyExisting(target, snapshot);
      return inventory;
    }
    await mkdir(stage);
    for (const dir of snapshot.directories) await mkdir(path.join(stage, dir), { recursive: true });
    // Read raw Git blobs. Checkout filters and project scripts are never invoked.
    for (const entry of snapshot.files.values()) {
      const child = spawn('git', ['--git-dir', bare, 'cat-file', 'blob', entry.sha], {
        env, windowsHide: true, stdio: ['ignore', 'pipe', 'inherit'],
      });
      try {
        const [[code]] = await Promise.all([once(child, 'close'), hashStream(entry, child.stdout, path.join(stage, entry.name))]);
        if (code !== 0) throw new Error(`git cat-file failed for ${entry.name}`);
      } finally {
        if (child.exitCode === null) child.kill();
      }
    }
    await rename(stage, target);
    return inventory;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

let next = 0, failure;
const inventories = [];
async function worker() {
  while (!failure && next < projects.length) {
    const index = next++;
    const project = projects[index];
    try {
      inventories[index] = await hydrate(project);
      console.log(`${project.repo} ${project.commit} (${project.fileCount} verified blobs)`);
    } catch (error) {
      failure ??= new Error(`${project.repo}: ${error.message}`, { cause: error });
    }
  }
}
await Promise.all(Array.from({ length: Math.min(jobs, projects.length) }, worker));
if (failure) throw failure;
if (values.inventory) {
  const destination = path.resolve(values.inventory);
  await mkdir(path.dirname(destination), { recursive: true });
  const temp = destination + '.lock';
  await mkdir(temp);
  try {
    const data = JSON.stringify(inventories, null, 2) + '\n';
    try {
      const previous = await lstat(destination);
      if (!previous.isFile() || (await readFile(destination, 'utf8')) !== data) {
        throw new Error(`Existing inventory differs: ${destination}`);
      }
    }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const file = path.join(temp, 'inventory.json');
      await writeFile(file, data);
      await rename(file, destination);
    }
  } finally { await rm(temp, { recursive: true, force: true }); }
}
