// Run against two built package directories and an optional external corpus.
// node benchmarks/replay-declarations.mjs UPSTREAM_PACKAGE EXTENDED_PACKAGE CORPUS REPORT.json
// CORPUS supplies fixtures/*/expected.json and results/premap-runs/*.json.gz.
// No checked-out applications, package downloads or build tools are used.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

const [baseline, candidate, corpus, output] = process.argv.slice(2);
if (!output) throw new Error('Expected UPSTREAM_PACKAGE EXTENDED_PACKAGE CORPUS REPORT.json');

// Namespaces of published packages in a Renovate extraction, translated to SupportedDeps.
const namespaces = {
  npm: 'npm', maven: 'maven', 'sbt-package': 'maven', 'sbt-plugin': 'maven', nuget: 'nuget',
  pypi: 'python', crate: 'rust', go: 'golang', packagist: 'php', rubygems: 'ruby', hex: 'hex',
  docker: 'docker', dart: 'pub', 'terraform-provider': 'terraform',
};
const productNames = {
  'gcp.gcs': 'Google Cloud Storage', 'gcp.kms': 'Google Cloud KMS', 'gcp.secretmanager': 'Google Secret Manager',
  'gcp.vertex': 'Google Vertex AI', 'aws.sqs': 'Amazon SQS', 'aws.ses': 'Amazon SES',
  'aws.cloudfront': 'Amazon CloudFront', 'firebase.firestore': 'Cloud Firestore',
  geminiai: 'Google Gemini', 'app-store': 'Apple App Store', apachetika: 'Apache Tika', rails: 'Ruby on Rails',
};
const synonyms = {
  next: 'nextjs', nuxtjs: 'nuxt', vue: 'vuejs', nest: 'nestjs', spring: 'springframework',
  postgres: 'postgresql', awss3: 'amazons3', telegram: 'telegrambotapi', tailwind: 'tailwindcss',
  cypressci: 'cypress', honojs: 'hono', expojs: 'expo', netaspire: 'aspire',
  doctrine: 'doctrineorm', hibernate: 'hibernateorm', apachekafka: 'kafka',
};
function key(name) {
  const lower = name.toLowerCase().replace(/[^a-z0-9+]/g, '');
  return synonyms[lower] ?? lower;
}

async function loadPackage(root) {
  const url = (file) => pathToFileURL(resolve(root, 'dist', file));
  await import(url('autoload.js'));
  const { dependencies, rules } = await import(url('index.js'));
  const names = new Map(rules.list.map((rule) => [rule.tech, rule.name]));
  const packageRules = new Map();
  for (const rule of rules.list) {
    const hasPackages = Boolean(rule.dependencies?.length);
    for (const label of identities({ names }, [rule.tech])) {
      packageRules.set(label, hasPackages || packageRules.get(label) === true);
    }
  }
  return { dependencies, names, packageRules };
}

function declarations(runs) {
  const packages = new Map(), excluded = new Set();
  const reports = runs.filter(({ command, result }) => command.argv[0] === 'renovate' && result.returncode === 0);
  if (!reports.length) return null;
  for (const { command, result } of runs) {
    if (result.returncode || command.argv[0] !== 'daodan-enry') continue;
    for (const row of JSON.parse(result.stdout)) {
      if (row.vendored || row.generated || row.documentation || row.binary) excluded.add(row.path);
    }
  }
  for (const { result } of reports) {
    const report = JSON.parse(result.stdout);
    for (const [manager, files] of Object.entries(report.repositories.local.packageFiles ?? {})) {
      for (const file of files) {
        if (excluded.has(file.packageFile)) continue;
        for (const dep of file.deps ?? []) {
          const source = dep.datasource ?? file.datasource;
          const type = manager === 'github-actions' && dep.depType === 'action' ? 'githubAction' : namespaces[source];
          const name = dep.packageName ?? dep.depName;
          if (!type || typeof name !== 'string' || !name.length) continue;
          if (!packages.has(type)) packages.set(type, new Set());
          packages.get(type).add(name);
        }
      }
    }
  }
  return packages;
}

function detect(build, packages) {
  const matches = new Set();
  for (const [type, names] of packages) {
    // A baseline without this namespace has no rule it could apply.
    if (!Object.hasOwn(build.dependencies.list, type)) continue;
    const result = build.dependencies.detect([...names], type);
    for (const id of result.keys()) matches.add(id);
  }
  return matches;
}

function identities(build, ids) {
  const names = new Set();
  for (const id of ids) {
    names.add(key(id));
    names.add(key(build.names.get(id) ?? id));
    if (productNames[id]) names.add(key(productNames[id]));
  }
  return names;
}

const [oldBuild, newBuild] = await Promise.all([loadPackage(baseline), loadPackage(candidate)]);
const fixtures = join(corpus, 'fixtures');
const records = join(corpus, 'results', 'premap-runs');
const projects = {};
const totals = () => ({ expected: 0, before: 0, after: 0, gained: 0, lost: 0, noMatchingPackage: 0,
                        noPackageRule: 0, noCatalogueName: 0 });
const counts = { frameworks: totals(), services: totals() };
const unavailable = [];
for (const dir of (await readdir(fixtures, { withFileTypes: true })).filter((item) => item.isDirectory())) {
  let archive;
  try {
    archive = await readFile(join(records, dir.name + '.json.gz'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    unavailable.push(dir.name);
    continue;
  }
  const packages = declarations(JSON.parse(gunzipSync(archive)).runs);
  if (!packages) {
    unavailable.push(dir.name);
    continue;
  }
  const oldIds = detect(oldBuild, packages), newIds = detect(newBuild, packages);
  const before = identities(oldBuild, oldIds), after = identities(newBuild, newIds);
  const expected = JSON.parse(await readFile(join(fixtures, dir.name, 'expected.json'), 'utf8'));
  const project = projects[dir.name] = { idsBefore: [...oldIds].sort(), idsAfter: [...newIds].sort() };
  for (const facet of Object.keys(counts)) {
    if (expected.unknown?.includes(facet)) continue;
    const wanted = new Map((expected[facet] ?? []).map(({ name }) => [key(name), name]));
    const gained = [], lost = [], missing = [];
    const count = counts[facet];
    count.expected += wanted.size;
    for (const [label, name] of wanted) {
      count.before += Number(before.has(label));
      count.after += Number(after.has(label));
      if (after.has(label) && !before.has(label)) gained.push(name);
      if (before.has(label) && !after.has(label)) lost.push(name);
      if (!after.has(label)) {
        missing.push(name);
        const hasPackages = newBuild.packageRules.get(label);
        if (hasPackages === undefined) count.noCatalogueName++;
        else if (!hasPackages) count.noPackageRule++;
        else count.noMatchingPackage++;
      }
    }
    count.gained += gained.length;
    count.lost += lost.length;
    project[facet] = { gained, lost, missing };
  }
}
const values = Object.values(projects);
const hasLabel = (project, which) => Object.keys(counts).some((facet) => project[facet]?.[which].length);
const summary = { recorded: values.length, unavailable,
                  projectsGainingLabels: values.filter((p) => hasLabel(p, 'gained')).length,
                  projectsMissingLabels: values.filter((p) => hasLabel(p, 'missing')).length,
                  rules: { before: oldBuild.names.size, after: newBuild.names.size }, counts };
await writeFile(output, JSON.stringify({ ...summary, projects }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
