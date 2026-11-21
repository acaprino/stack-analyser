// Bring the recognition signs of a service registry into the rules of this package.
// node benchmarks/port-registry.mjs REGISTRY.json [--write]
//
// It reads the built package in dist/ (run `npm run build` first) and the registry, and settles every sign of
// every registry entry that has signs: the package already recognises it, it becomes a rule, or it is a
// difference written by hand in benchmarks/registry-port.json with its reason. Without --write nothing is
// written: the report goes to stdout and what is left to do goes to stderr. With --write it creates the rule
// files, adds the signs to the existing ones, lists the new ids in src/types/techs.ts and writes the report.
// After --write run `npm run build`, which also regenerates the index files, and run the script again: a second
// run changes nothing. The exit code is 0 only when every sign is a rule or a recorded difference.
//
// A sign is written `<type>:<name>` for a package of that dependency type (`npm:vite`), and
// `pattern:<type>:<expression>`, `env:<name>`, `host:<name>`, `file:<name>` or `source:<kind>:<name>`.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = join(ROOT, 'benchmarks', 'registry-port.json');
const SCHEMA = 'daodan/service-registry/v1';
const WIDTH = 100;

// Registry ecosystem -> dependency type of the rules.
const ECOSYSTEMS = {
  npm: 'npm', pypi: 'python', crates: 'rust', go: 'golang', composer: 'php', rubygems: 'ruby', docker: 'docker',
  'github-actions': 'githubAction', terraform: 'terraform', 'terraform-resource': 'terraform.resource',
  deno: 'deno', maven: 'maven', nuget: 'nuget', pub: 'pub', hex: 'hex', swiftpm: 'swiftpm',
};
// Registry type of a service -> type of the rule; any other service is `saas`.
const SERVICE_TYPES = { database: 'db', filesystem: 'storage', coda: 'queue', autenticazione: 'auth', gateway: 'network' };
// The properties a sign can add to a rule, in the order a rule file writes them.
const PROPERTIES = ['dotenv', 'hosts', 'files', 'dependencies'];
const PROPERTY_OF = { env: 'dotenv', host: 'hosts', file: 'files', package: 'dependencies', pattern: 'dependencies' };

// ---------------------------------------------------------------- the registry

function ruleType(entry) {
  const category = entry.category ?? (entry.kind === 'service' ? 'service' : 'tool');
  if (category === 'service') return SERVICE_TYPES[entry.type] ?? 'saas';
  if (category === 'framework') return 'framework';
  if (category === 'library' || category === 'tool') return 'tool';
  throw new Error(`${entry.id}: unknown category ${category}`);
}

function dependencyType(ecosystem) {
  if (!Object.hasOwn(ECOSYSTEMS, ecosystem)) throw new Error(`unknown ecosystem ${ecosystem}`);
  return ECOSYSTEMS[ecosystem];
}

/** Every sign of an entry. Names are trimmed: the older release had names with a space after them. */
function signsOf(entry) {
  const signs = entry.signs ?? {};
  const found = new Map();
  const add = (sign) => found.set(sign.label, sign);
  const trimmed = (values) => values.map((value) => value.trim()).filter(Boolean);
  for (const [ecosystem, names] of Object.entries(signs.packages ?? {})) {
    const type = dependencyType(ecosystem);
    for (const value of trimmed(names)) add({ kind: 'package', type, value, label: `${type}:${value}` });
  }
  for (const [ecosystem, sources] of Object.entries(signs.patterns ?? {})) {
    const type = dependencyType(ecosystem);
    for (const value of sources) add({ kind: 'pattern', type, value, label: `pattern:${type}:${value}` });
  }
  for (const [kind, list] of [['env', 'env'], ['host', 'hosts'], ['file', 'files']]) {
    for (const value of trimmed(signs[list] ?? [])) add({ kind, value, label: `${kind}:${value}` });
  }
  for (const [kind, values] of Object.entries(signs.source ?? {})) {
    for (const value of values) add({ kind: 'source', value, label: `source:${kind}:${value}` });
  }
  return [...found.values()];
}

// ---------------------------------------------------------------- the built package

async function loadFork() {
  const dist = (file) => pathToFileURL(join(ROOT, 'dist', file)).href;
  if (!existsSync(join(ROOT, 'dist', 'index.js'))) throw new Error('dist/ is missing: run `npm run build` first');
  await import(dist('autoload.js'));
  const { rules, dependencies } = await import(dist('index.js'));
  const { packagePattern, imageReference } = await import(dist('common/packageIdentity.js'));
  return {
    byId: new Map(rules.list.map((rule) => [rule.tech, rule])),
    // Every dependency of every rule, with the name it is shown by.
    owned: rules.list.flatMap((rule) => (rule.dependencies ?? []).map((dep) =>
      ({ tech: rule.tech, type: dep.type, name: dep.name, example: dep.example ?? dep.name }))),
    detect: (name, type) => [...dependencies.detect([name], type).keys()],
    // What a name is compared as: an image is reduced to its repository.
    comparable: (name, type) => (type === 'docker' ? imageReference(name).name : name),
    exact: (name, type) => packagePattern(name, type),
    files: await ruleFiles(),
  };
}

/** The source file of every rule, found by its `tech`: one file a technology, and an index for each ecosystem. */
async function ruleFiles() {
  const files = new Map();
  const base = join(ROOT, 'src', 'rules');
  const sources = [];
  for (const folder of await readdir(base, { withFileTypes: true })) {
    if (!folder.isDirectory() || folder.name === '__snapshots__') continue;
    if (folder.name === 'spec') {
      for (const ecosystem of await readdir(join(base, 'spec'), { withFileTypes: true })) {
        if (ecosystem.isDirectory()) sources.push(join(base, 'spec', ecosystem.name, 'index.ts'));
      }
      continue;
    }
    for (const name of await readdir(join(base, folder.name))) {
      if (name.endsWith('.ts') && name !== 'index.ts' && !name.endsWith('.test.ts')) sources.push(join(base, folder.name, name));
    }
  }
  for (const file of sources.filter((source) => existsSync(source))) {
    const tech = /^\s+tech:\s*'([^']+)'/m.exec(await readFile(file, 'utf8'));
    if (tech) files.set(tech[1], file);
  }
  return files;
}

// ---------------------------------------------------------------- the plan

const normal = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The rule of the fork that is the same technology as an entry the fork does not have: same name or a shared package. */
function duplicateOf(entry, signs, fork) {
  const names = new Set([normal(entry.name), normal(entry.id)]);
  const packages = new Set(signs.filter((s) => s.kind === 'package').map((s) => `${s.type}:${s.value.toLowerCase()}`));
  for (const rule of fork.byId.values()) {
    if (names.has(normal(rule.name)) || names.has(normal(rule.tech))) return rule;
    for (const dep of rule.dependencies ?? []) {
      if (typeof dep.name === 'string' && packages.has(`${dep.type}:${dep.name.trim().toLowerCase()}`)) return rule;
    }
  }
  return undefined;
}

/** A pattern that is only a literal, as the text it matches: `^io\.quarkus:` is `io.quarkus:`. */
function literalOf(source) {
  const text = source.replace(/^\^/, '');
  return /^(?:[\w@:/-]|\\[./\\@:-])+$/.test(text) ? text.replace(/\\(.)/g, '$1') : null;
}

/** What a sign adds to a rule, or why it cannot: 'covered', { add }, or a sentence. */
function judge(sign, target, rule, ctx) {
  if (sign.kind === 'package') return judgePackage(sign, target, rule, ctx);
  if (sign.kind === 'pattern') return judgePattern(sign, target, rule, ctx);
  if (sign.kind === 'env') return (rule?.dotenv ?? []).includes(sign.value) ? 'covered' : { add: quote(sign.value) };
  if (sign.kind === 'host') {
    const known = (rule?.hosts ?? []).some((host) => host.toLowerCase() === sign.value.toLowerCase());
    return known ? 'covered' : { add: quote(sign.value) };
  }
  if (sign.kind === 'file') {
    const files = rule?.files;
    if (files instanceof RegExp) {
      files.lastIndex = 0;
      return files.test(sign.value) ? 'covered' : 'the rule matches file names by an expression';
    }
    // The registry names a directory without the slash that marks it in the rules.
    const bare = sign.value.replace(/\/$/, '');
    if (Array.isArray(files) && (files.includes(bare) || files.includes(`${bare}/`))) return 'covered';
    return { add: quote(sign.value) };
  }
  return 'a source sign is read by the fork, not listed in a rule';
}

function judgePackage(sign, target, rule, { fork, claims }) {
  const hits = fork.detect(sign.value, sign.type);
  if (hits.includes(target)) return 'covered';
  // The registry compares names without regard to case and writes them in lower case; the rule may spell the
  // same package as it is published (github.com/DataDog/dd-trace-go).
  const spelt = (rule?.dependencies ?? []).some((dep) => dep.type === sign.type && typeof dep.name === 'string'
    && dep.name.toLowerCase() === sign.value.toLowerCase());
  if (spelt) return 'covered';
  if (hits.length) return `the fork identifies it as ${hits.join(', ')}`;
  const name = fork.comparable(sign.value, sign.type);
  const exact = fork.exact(sign.value, sign.type);
  for (const claim of claims) {
    if (claim.type !== sign.type || claim.target === target) continue;
    if (claim.test(name) || exact.test(fork.comparable(claim.example, sign.type))) {
      return `it overlaps ${claim.example}, which the registry gives to ${claim.target}`;
    }
  }
  return { add: `{ type: ${quote(sign.type)}, name: ${quote(sign.value)} }`, claim: { example: sign.value, test: (n) => exact.test(n) } };
}

function judgePattern(sign, target, rule, { fork, claims, names }) {
  const own = (rule?.dependencies ?? []).filter((dep) => dep.type === sign.type && dep.name instanceof RegExp);
  if (own.some((dep) => dep.name.source === sign.value)) return 'covered';
  let expression;
  try {
    expression = new RegExp(sign.value);
  } catch {
    return 'it is not a regular expression';
  }
  const matches = (name) => expression.test(fork.comparable(name, sign.type));
  const other = fork.owned.find((dep) => dep.tech !== target && dep.type === sign.type && matches(dep.example));
  if (other) return `it would also match ${other.example}, which the fork gives to ${other.tech}`;
  const claimed = claims.find((claim) => claim.type === sign.type && claim.target !== target && matches(claim.example));
  if (claimed) return `it would also match ${claimed.example}, which the registry gives to ${claimed.target}`;
  // The example is a name the expression was written for that nothing recognises yet. A rule that has an
  // expression of this kind already holds its own, narrower form: that is a decision, not a gap.
  const candidates = [...(names.get(`${target}\0${sign.type}`) ?? []), ...fork.owned
    .filter((dep) => dep.tech === target && dep.type === sign.type).map((dep) => dep.example)];
  let example = candidates.find((name) => matches(name) && fork.detect(name, sign.type).length === 0);
  const literal = literalOf(sign.value);
  if (!example && own.length === 0 && literal !== null && expression.test(literal) && fork.detect(literal, sign.type).length === 0) {
    example = literal;
  }
  if (!example) return 'the fork already recognises every name it matches here';
  const fields = [`type: ${quote(sign.type)}`, `name: /${expression.source}/`, `example: ${quote(example)}`];
  return { add: `{ ${fields.join(', ')} }`, claim: { example, test: (n) => expression.test(n) } };
}

function makePlan(registry, fork, differences) {
  const settled = new Set(differences.map((d) => `${d.id}\0${d.sign}`));
  const upstream = new Set(registry.entries.filter((e) => e.from.includes('stack-analyser')).map((e) => e.id));
  const plan = { fresh: [], extended: new Map(), renamed: {}, renames: [], unsettled: [], covered: 0, settled: new Set() };
  const claims = [];
  const names = new Map(); // the packages an entry has, by entry and type: the examples of its expressions
  for (const entry of registry.entries) {
    for (const sign of signsOf(entry).filter((s) => s.kind === 'package')) {
      const key = `${entry.id}\0${sign.type}`;
      names.set(key, [...(names.get(key) ?? []), sign.value]);
    }
  }
  const ctx = { fork, claims, names };
  const used = new Set([...fork.byId.values()].map((rule) => rule.name));
  for (const entry of registry.entries) {
    const signs = signsOf(entry);
    if (!signs.length) continue;
    let target = entry.id;
    let rule = fork.byId.get(target);
    if (!rule) {
      const same = duplicateOf(entry, signs, fork);
      if (same && upstream.has(same.tech)) {
        // Of a duplicate the id the older release had stays: the entry joins that rule.
        plan.renamed[entry.id] = same.tech;
        target = same.tech;
        rule = same;
      } else if (same) {
        // The fork's rule was born after the older release, so the registry's id stays and the rule is renamed.
        plan.renames.push({ from: same.tech, to: entry.id });
        continue;
      } else if (used.has(entry.name)) {
        throw new Error(`${entry.id}: the name ${entry.name} already belongs to another rule`);
      }
    }
    const added = rule ? (plan.extended.get(target) ?? { signs: [], items: [] }) : { id: entry.id, name: entry.name, type: ruleType(entry), signs: [], items: [] };
    if (!rule) used.add(entry.name);
    for (const sign of signs) {
      if (settled.has(`${entry.id}\0${sign.label}`)) {
        plan.settled.add(`${entry.id}\0${sign.label}`);
        continue;
      }
      const verdict = judge(sign, target, rule, ctx);
      if (verdict === 'covered') {
        plan.covered++;
      } else if (typeof verdict === 'string') {
        plan.unsettled.push({ id: entry.id, sign: sign.label, why: verdict });
      } else {
        if (verdict.claim) claims.push({ type: sign.type, target, ...verdict.claim });
        added.items.push({ property: PROPERTY_OF[sign.kind], text: verdict.add });
        added.signs.push(sign.label);
      }
    }
    if (rule && added.items.length) plan.extended.set(target, added);
    if (!rule && added.items.length) plan.fresh.push(added);
  }
  return plan;
}

// ---------------------------------------------------------------- source text

const quote = (text) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** The index after a string, template, comment or regular expression that starts at `i`, or `i` itself. */
function skipLiteral(text, i, previous) {
  const c = text[i];
  if (c === "'" || c === '"' || c === '`') {
    for (let j = i + 1; j < text.length; j++) {
      if (text[j] === '\\') j++;
      else if (text[j] === c) return j + 1;
    }
    return text.length;
  }
  if (c === '/' && text[i + 1] === '/') {
    const end = text.indexOf('\n', i);
    return end < 0 ? text.length : end;
  }
  if (c === '/' && text[i + 1] === '*') {
    const end = text.indexOf('*/', i + 2);
    return end < 0 ? text.length : end + 2;
  }
  if (c === '/' && /[(,=:[{!&|?;]|^$/.test(previous)) {
    let inClass = false;
    for (let j = i + 1; j < text.length; j++) {
      const d = text[j];
      if (d === '\\') j++;
      else if (d === '[') inClass = true;
      else if (d === ']') inClass = false;
      else if (d === '/' && !inClass) {
        let end = j + 1;
        while (/[a-z]/i.test(text[end] ?? '')) end++;
        return end;
      }
    }
  }
  return i;
}

/** Walk `text` from `from`, calling `visit(char, index, depth)` outside of literals, until it returns true. */
function walk(text, from, visit) {
  let depth = 0;
  let previous = '';
  for (let i = from; i < text.length; ) {
    const next = skipLiteral(text, i, previous);
    if (next !== i) {
      previous = 'x';
      i = next;
      continue;
    }
    const c = text[i];
    if ('[{('.includes(c)) depth++;
    else if (']})'.includes(c)) depth--;
    if (visit(c, i, depth)) return i;
    if (!/\s/.test(c)) previous = c;
    i++;
  }
  return -1;
}

/** The index of the bracket that closes the one at `open`. */
function closing(text, open) {
  const end = walk(text, open, (c, _i, depth) => depth === 0 && ']})'.includes(c));
  if (end < 0) throw new Error('unbalanced brackets');
  return end;
}

/** The elements of a list written on one line, split at the commas that are not inside a bracket or literal. */
function elements(inner) {
  const found = [];
  let start = 0;
  walk(inner, 0, (c, i, depth) => {
    if (c === ',' && depth === 0) {
      found.push(inner.slice(start, i).trim());
      start = i + 1;
    }
    return false;
  });
  found.push(inner.slice(start).trim());
  return found.filter(Boolean);
}

/** One element on its own line, or one field per line when it does not fit. */
function line(item) {
  if (!item.startsWith('{ ') || `    ${item},`.length <= WIDTH) return `    ${item},`;
  return `    {\n${elements(item.slice(1, -1)).map((field) => `      ${field},`).join('\n')}\n    },`;
}

/** One property of a rule, as prettier writes it at the width of this repository. */
function property(name, items) {
  const inline = `  ${name}: [${items.join(', ')}],`;
  // Prettier breaks a list of several objects, and keeps a short one on a line.
  if ((name !== 'dependencies' || items.length === 1) && inline.length <= WIDTH && !items.some((i) => i.includes('\n'))) return inline;
  return `  ${name}: [\n${items.map(line).join('\n')}\n  ],`;
}

/** Add elements to a property of a rule, creating the property when the rule has none. */
function addTo(text, name, added) {
  const found = new RegExp(`^  ${name}: \\[`, 'm').exec(text);
  if (!found) {
    const end = text.lastIndexOf('\n});');
    if (end < 0) throw new Error('the rule does not end with `});`');
    const before = text.slice(0, end).trimEnd();
    return `${before}${before.endsWith(',') ? '' : ','}\n${property(name, added)}${text.slice(end)}`;
  }
  const open = found.index + found[0].length - 1;
  const close = closing(text, open);
  const inner = text.slice(open + 1, close);
  const fresh = added.filter((item) => !inner.includes(item));
  if (!fresh.length) return text;
  if (!inner.includes('\n')) {
    const tail = text[close + 1] === ',' ? close + 2 : close + 1;
    return text.slice(0, found.index) + property(name, [...elements(inner), ...fresh]) + text.slice(tail);
  }
  const lineStart = text.lastIndexOf('\n', close) + 1;
  if (text.slice(lineStart, close).trim()) throw new Error(`cannot edit the ${name} list: its end shares a line`);
  const before = text.slice(0, lineStart).trimEnd();
  // A comment may close the list: it is left as it is, and the element before it already has its comma.
  const last = before.slice(before.lastIndexOf('\n') + 1).trim();
  const comma = last.startsWith('//') || before.endsWith(',') || before.endsWith('[') ? '' : ',';
  return `${before}${comma}\n${fresh.map(line).join('\n')}\n${text.slice(lineStart)}`;
}

function ruleText(draft) {
  const lines = ["import { register } from '../../register.js';", '', 'register({', `  tech: ${quote(draft.id)},`,
    `  name: ${quote(draft.name)},`, `  type: ${quote(draft.type)},`];
  for (const name of PROPERTIES) {
    const items = draft.items.filter((item) => item.property === name).map((item) => item.text);
    if (items.length) lines.push(property(name, items));
  }
  return `${lines.join('\n')}\n});\n`;
}

/** Add ids to the AllowedKeys union, which is kept in order. */
function addKeys(text, ids) {
  const start = text.indexOf('export type AllowedKeys');
  const end = text.indexOf(';\n', start);
  const keys = [...text.slice(start, end).matchAll(/^ {2}\| '([^']+)'/gm)].map((m) => m[1]);
  const all = [...new Set([...keys, ...ids])].sort((a, b) => (a < b ? -1 : 1));
  if (all.length === keys.length) return text;
  return `${text.slice(0, start)}export type AllowedKeys =\n${all.map((key) => `  | '${key}'`).join('\n')}${text.slice(end)}`;
}

/** Every file the plan changes, with its new text; nothing is written before all of them are made. */
async function changes(plan, fork) {
  const files = new Map();
  for (const draft of plan.fresh) {
    const file = join(ROOT, 'src', 'rules', draft.type, `${draft.id}.ts`);
    if (!existsSync(file)) files.set(file, ruleText(draft));
    else if (!(await readFile(file, 'utf8')).includes(`tech: ${quote(draft.id)}`)) throw new Error(`${file} is another rule's`);
  }
  for (const [id, { items }] of plan.extended) {
    const file = fork.files.get(id);
    if (!file) throw new Error(`no source file for the rule ${id}`);
    let text = await readFile(file, 'utf8');
    for (const name of PROPERTIES) {
      const added = items.filter((item) => item.property === name).map((item) => item.text);
      if (added.length) text = addTo(text, name, added);
    }
    files.set(file, text);
  }
  const keys = join(ROOT, 'src', 'types', 'techs.ts');
  files.set(keys, addKeys(await readFile(keys, 'utf8'), plan.fresh.map((draft) => draft.id)));
  return files;
}

// ---------------------------------------------------------------- the report

function checkDifferences(list) {
  if (!Array.isArray(list)) return ['`differences` is not a list'];
  const problems = [];
  const seen = new Set();
  for (const [i, difference] of list.entries()) {
    const { id, sign, reason } = difference ?? {};
    if (typeof id !== 'string' || typeof sign !== 'string') problems.push(`differences[${i}] has no id or no sign`);
    else if (typeof reason !== 'string' || reason.trim().length < 20) problems.push(`${id} ${sign}: the reason is missing or too short`);
    else if (seen.has(`${id}\0${sign}`)) problems.push(`${id} ${sign}: listed twice`);
    else seen.add(`${id}\0${sign}`);
  }
  return problems;
}

const unique = (list) => [...new Set(list)];
const sorted = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => (a < b ? -1 : 1)));

/** The report: what this run adds, with what an earlier run for the same registry added. */
function buildReport(plan, sha, earlier, differences) {
  const same = earlier?.registry === sha;
  const extended = { ...(same ? earlier.extended : {}) };
  for (const [id, { signs }] of plan.extended) extended[id] = unique([...(extended[id] ?? []), ...signs]);
  return {
    registry: sha,
    new: unique([...(same ? earlier.new : []), ...plan.fresh.map((draft) => draft.id)]).sort(),
    extended: sorted(Object.fromEntries(Object.entries(extended).map(([id, signs]) => [id, [...signs].sort()]))),
    renamed: sorted({ ...(same ? earlier.renamed : {}), ...plan.renamed }),
    differences,
  };
}

function summarise(plan, differences) {
  const added = [...plan.fresh, ...plan.extended.values()].flatMap((entry) => entry.signs);
  const count = (list, prefix) => list.filter((label) => label.startsWith(prefix)).length;
  const kinds = (list) => `${count(list, 'pattern:')} patterns, ${count(list, 'env:')} variables, ${count(list, 'host:')} hosts, ${count(list, 'file:')} files`;
  const lines = [
    `new rules: ${plan.fresh.length}; entries that join a rule of the fork under another id: ${Object.keys(plan.renamed).length}`,
    `to add: ${added.length} signs in ${plan.fresh.length + plan.extended.size} rules (${kinds(added)}; the rest are packages)`,
    `covered already: ${plan.covered}; differences: ${plan.settled.size} of ${differences.length}; unsettled: ${plan.unsettled.length}`,
  ];
  for (const { from, to } of plan.renames) lines.push(`RENAME the rule ${from} to ${to}: the registry's id stays, the rule is newer than the older release`);
  for (const { id, sign, why } of plan.unsettled) lines.push(`UNSETTLED ${id} ${sign}: ${why}`);
  for (const { id, sign } of differences) {
    if (!plan.settled.has(`${id}\0${sign}`)) lines.push(`STALE ${id} ${sign}: the registry has no such sign left to settle`);
  }
  return lines.join('\n');
}

async function main() {
  const [path, ...flags] = process.argv.slice(2);
  if (!path || flags.some((flag) => flag !== '--write')) throw new Error('Usage: node benchmarks/port-registry.mjs REGISTRY.json [--write]');
  const writing = flags.includes('--write');
  const bytes = await readFile(path);
  const registry = JSON.parse(bytes.toString('utf8'));
  if (registry.schema !== SCHEMA) throw new Error(`expected the schema ${SCHEMA}`);
  const sha = createHash('sha256').update(bytes).digest('hex');
  const earlier = existsSync(REPORT) ? JSON.parse(await readFile(REPORT, 'utf8')) : null;
  const differences = earlier?.differences ?? [];
  const invalid = checkDifferences(differences);
  const fork = await loadFork();
  const plan = makePlan(registry, fork, invalid.length ? [] : differences);
  const files = writing ? await changes(plan, fork) : new Map();
  for (const [file, text] of files) await writeFile(file, text);
  const report = buildReport(plan, sha, earlier, differences);
  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (writing) await writeFile(REPORT, text);
  else process.stdout.write(text);
  console.error(summarise(plan, differences));
  for (const problem of invalid) console.error(`INVALID ${problem}`);
  // Writing settles what it adds; without --write whatever is left to add is still left to do.
  const left = writing ? 0 : plan.fresh.length + plan.extended.size;
  process.exitCode = plan.unsettled.length || plan.renames.length || invalid.length || left ? 1 : 0;
}

await main();
