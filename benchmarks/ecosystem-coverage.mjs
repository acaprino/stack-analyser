// The frameworks of each ecosystem and whether the fork recognises them (benchmarks/README.md, "Ecosystem coverage").
//
// node benchmarks/ecosystem-coverage.mjs fetch LISTS.json
//   The packages of each registry that public repositories depend on, from packages.ecosyste.ms, down to 1% of the
//   dependent repositories of its most depended-on package.
// node benchmarks/ecosystem-coverage.mjs candidates LISTS.json
//   The packages the first pass keeps, by ecosystem: what is to be decided by hand.
// node benchmarks/ecosystem-coverage.mjs check LISTS.json DECISIONS.json PACKAGE_DIR
//   For every package decided a framework, the technologies the built package at PACKAGE_DIR gives for its name.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The registries of ecosyste.ms, by the dependency type of the fork.
const registries = {
  npm: 'npmjs.org',
  python: 'pypi.org',
  golang: 'proxy.golang.org',
  rust: 'crates.io',
  nuget: 'nuget.org',
  maven: 'repo1.maven.org',
  php: 'packagist.org',
  ruby: 'rubygems.org',
  pub: 'pub.dev',
};
// The threshold: 1% of the dependent repositories of the ecosystem's most depended-on package.
const share = 0.01;
const perPage = 1000;
const firstPass = new RegExp(
  String.raw`\b(?:framework|gui|ui|user[ -]interfaces?|widgets?|toolkit|components?|web[ -]server|http[ -]server|css` +
    String.raw`|web|app|application|server|http|mvc|rest|api|router|routing|site|static|asgi|wsgi|rack|sass|less|theme` +
    String.raw`|style|desktop|mobile|native|react|vue|angular|flutter|bootstrap)\b`,
  'i'
);

const [command, ...args] = process.argv.slice(2);

async function page(registry, number) {
  const url =
    `https://packages.ecosyste.ms/api/v1/registries/${registry}/packages` +
    `?sort=dependent_repos_count&order=desc&per_page=${perPage}&page=${number}`;
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, {
      headers: { 'user-agent': 'stack-analyser-benchmark (ecosystem coverage)' },
    });
    if (response.ok) return response.json();
    if (attempt === 5 || ![429, 500, 502, 503, 504].includes(response.status))
      throw new Error(`${url}: ${response.status}`);
    await new Promise((done) => setTimeout(done, 5000 * attempt));
  }
}

async function fetchLists(output) {
  const lists = { fetched: new Date().toISOString(), source: 'packages.ecosyste.ms', share, ecosystems: {} };
  for (const [type, registry] of Object.entries(registries)) {
    const rows = [];
    let threshold = 0;
    for (let number = 1; ; number++) {
      const items = await page(registry, number);
      if (items.length === 0) break;
      threshold ||= Math.ceil(items[0].dependent_repos_count * share);
      for (const item of items) {
        if (item.dependent_repos_count < threshold) break;
        rows.push({
          rank: rows.length + 1,
          name: item.name,
          dependentRepos: item.dependent_repos_count,
          downloads: item.downloads,
          downloadsPeriod: item.downloads_period,
          description: item.description ?? '',
          keywords: item.keywords ?? [],
        });
      }
      if (items.at(-1).dependent_repos_count < threshold) break;
      await new Promise((done) => setTimeout(done, 1000));
    }
    lists.ecosystems[type] = { registry, threshold, packages: rows };
    console.error(type, threshold, rows.length);
  }
  await writeFile(output, JSON.stringify(lists, null, 1) + '\n');
}

function candidates(lists) {
  const out = {};
  for (const [type, { packages }] of Object.entries(lists.ecosystems)) {
    out[type] = packages.filter((row) => firstPass.test(`${row.description} ${row.keywords.join(' ')}`));
  }
  return out;
}

async function check(lists, decisions, root) {
  const url = (file) => pathToFileURL(resolve(root, 'dist', file));
  await import(url('autoload.js'));
  const { dependencies, rules } = await import(url('index.js'));
  const names = new Map(rules.list.map((rule) => [rule.tech, rule.name]));
  const report = {};
  for (const [type, { packages }] of Object.entries(lists.ecosystems)) {
    const rank = new Map(packages.map((row) => [row.name, row]));
    report[type] = [];
    for (const [name, decision] of Object.entries(decisions[type] ?? {})) {
      if (decision.framework !== true) continue;
      const row = rank.get(name);
      if (!row) throw new Error(`${type} ${name} is not in the list`);
      if (!firstPass.test(`${row.description} ${row.keywords.join(' ')}`))
        throw new Error(`${type} ${name} is not a candidate of the first pass`);
      const techs = [...dependencies.detect([name], type).keys()].sort();
      report[type].push({ rank: row.rank, name, dependentRepos: row.dependentRepos, techs,
                          names: techs.map((tech) => names.get(tech)), covered: techs.length > 0 });
    }
    report[type].sort((a, b) => a.rank - b.rank);
  }
  return report;
}

if (command === 'fetch') {
  await fetchLists(args[0]);
} else if (command === 'candidates') {
  const lists = JSON.parse(await readFile(args[0], 'utf8'));
  for (const [type, rows] of Object.entries(candidates(lists))) {
    console.log(`## ${type} (${rows.length})`);
    for (const row of rows) console.log(`${row.rank}\t${row.name}\t${row.description.slice(0, 120)}`);
  }
} else if (command === 'check') {
  const lists = JSON.parse(await readFile(args[0], 'utf8'));
  const decisions = JSON.parse(await readFile(args[1], 'utf8'));
  const report = await check(lists, decisions, args[2]);
  console.log(JSON.stringify(report, null, 1));
} else {
  throw new Error('Expected fetch LISTS.json, candidates LISTS.json or check LISTS.json DECISIONS.json PACKAGE_DIR');
}
