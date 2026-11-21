// Derive a bounded reference set from original project declarations. This script does
// not load Specfy, its rules, or either CLI's results. Run before examining the scan.
// node benchmarks/github-review-labels.mjs PROJECTS_DIR PROJECTS.json LABELLED.json INVENTORY.json
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import TOML from '@iarna/toml';
import { SaxesParser } from 'saxes';
import { parseDocument } from 'yaml';

const [root, manifest, output, inventoryPath] = process.argv.slice(2);
if (!inventoryPath) throw new Error('Expected PROJECTS_DIR PROJECTS.json LABELLED.json INVENTORY.json');
const source = JSON.parse(await readFile(manifest, 'utf8'));
const inventory = new Map(JSON.parse(await readFile(inventoryPath, 'utf8')).map((row) => [row.repo, row.files]));
const panel = JSON.parse(await readFile(new URL('./github-review-panel.json', import.meta.url), 'utf8'));
const ignored = /^(?:\.git|node_modules|third[_-]party|vendor|vendored|external|fixtures?|__fixtures__|examples?|samples?|docs|dist|target|build)$/i;
const pkgId = (system, name) => system === 'pypi' ? name.toLowerCase().replace(/[-_.]+/g, '-') :
  system === 'nuget' || system === 'swiftpm' ? name.toLowerCase() :
    system === 'gomod' ? name.replace(/\/v(?:[2-9]|[1-9]\d+)$/, '') : name;
const identities = new Map();
for (const [system, products] of Object.entries(panel)) {
  for (const [id, packages] of Object.entries(products)) for (const name of packages) {
    const key = system + ':' + pkgId(system, name);
    if (identities.has(key)) throw new Error('Duplicate panel identity: ' + key);
    identities.set(key, id);
  }
}
function mapping(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function yaml(text) {
  const doc = parseDocument(text);
  if (doc.errors.length) throw doc.errors[0];
  return doc.toJS({maxAliasCount: 100});
}
const ciSystems = [
  { id: 'circleci', config: /^\.circleci\/config\.ya?ml$/i, mentions: /circleci|circle-ci|circle[.]ci/i },
  { id: 'travisci', config: /^\.travis\.ya?ml$/i, mentions: /travis/i },
  { id: 'appveyor', config: /^\.?appveyor\.ya?ml$/i, mentions: /appveyor|app-veyor/i },
];
const supportedManifest = /^(package\.json|pyproject\.toml|requirements[^/]*\.txt|Cargo\.toml|go\.mod|pom\.xml|build\.gradle(?:\.kts)?|composer\.json|Gemfile|[^/]+\.gemspec|mix\.exs|pubspec\.yaml|Package\.swift|[^/]+\.(?:cs|fs|vb)proj)$/;
function xmlEntries(text) {
  const parser = new SaxesParser({xmlns:true});
  const elements = [];
  const stack = [];
  parser.on('doctype', () => { throw new Error('DTD'); });
  parser.on('opentag', (tag) => {
    const parent = stack.at(-1);
    const entry = {tag: tag.local, ns: tag.uri, chain: parent ? [...parent.chain, tag.local] : [tag.local],
      fields: {}, attributes: Object.fromEntries(Object.values(tag.attributes).map((attr) => [attr.name, attr.value])),
      value:'', conditional: Boolean(parent?.conditional || tag.attributes.Condition)};
    stack.push(entry);
    elements.push(entry);
  });
  parser.on('text', (value) => { if (stack.length) stack.at(-1).value += value; });
  parser.on('closetag', () => {
    const entry = stack.pop(), parent = stack.at(-1);
    if (parent && parent.ns === entry.ns) parent.fields[entry.tag] = entry.value.trim();
  });
  parser.write(text).close();
  return elements;
}

function readDeclarations(file, text, mark) {
  const name = basename(file);
  const emit = (system, role, pkg, evidence) => {
    const id = identities.get(system + ':' + pkgId(system, pkg));
    if (id) mark(id, system, role, evidence);
  };
  const py = (line, role, field) => {
    if (typeof line !== 'string') return;
    const found = /^\s*([a-z\d][a-z\d._-]*)(?=\s*(?:\[|[=<>~!;@(#]|$))/i.exec(line);
    if (found) emit('pypi', role, found[1], field + ' ' + line);
  };
  if (name === 'package.json') {
    const data = JSON.parse(text);
    for (const [field, role] of [['dependencies','runtime'],['devDependencies','development'],
      ['optionalDependencies','optional'],['peerDependencies','peer']]) {
      if (!mapping(data[field])) continue;
      for (const [declared, spec] of Object.entries(data[field])) {
        if (typeof spec !== 'string' || /^(?:workspace|link|file|portal|git\+[^:]+|https?):|^\.{1,2}\//i.test(spec)) continue;
        const alias = /^npm:((?:@[^/@\s]+\/)?[^@\s]+)(?:@.*)?$/.exec(spec);
        if (!alias && !/^(?:[~^*<>=\dXxv|\s.-]*(?:-[A-Za-z\d][\w.-]*)?(?:\+[\w.-]+)?|latest|next|beta|canary)$/.test(spec)) continue;
        emit('npm', role, alias ? alias[1] : declared, field + '.' + declared + ' = ' + spec);
      }
    }
    const manager = /^(npm|yarn|pnpm)@\d/.exec(data.packageManager ?? '');
    if (manager) mark(manager[1], 'npm', 'toolchain', 'packageManager = ' + data.packageManager);
  } else if (name === 'pyproject.toml') {
    const data = TOML.parse(text);
    for (const item of data.project?.dependencies ?? []) py(item, 'runtime', 'project.dependencies');
    for (const [group, deps] of Object.entries(data.project?.['optional-dependencies'] ?? {}))
      for (const item of deps) py(item, 'optional', 'project.optional-dependencies.' + group);
    for (const [group, deps] of Object.entries(data['dependency-groups'] ?? {}))
      for (const item of deps) py(item, 'development', 'dependency-groups.' + group);
    for (const item of data['build-system']?.requires ?? []) py(item, 'build', 'build-system.requires');
    const poetry = data.tool?.poetry;
    for (const [group, deps] of [['dependencies', poetry?.dependencies], ['dev-dependencies', poetry?.['dev-dependencies']],
      ...Object.entries(poetry?.group ?? {}).map(([key, val]) => ['group.' + key, val.dependencies])]) {
      for (const [pkg, info] of Object.entries(deps ?? {})) {
        if (mapping(info) && (info.path || info.git || info.url)) continue;
        emit('pypi', group === 'dependencies' ? 'runtime' : 'development', pkg, 'tool.poetry.' + group + '.' + pkg);
      }
    }
  } else if (/^requirements[^/]*\.txt$/.test(name)) {
    for (const line of text.split(/\r?\n/)) py(line.split(/\s+#/)[0], /dev|test/i.test(name) ? 'development' : 'declared', name);
  } else if (name === 'Cargo.toml') {
    const data = TOML.parse(text);
    if (mapping(data.package) || mapping(data.workspace)) mark('cargo', 'cargo', 'toolchain', 'Cargo.toml defines a package or workspace');
    for (const scope of [data, ...Object.values(data.target ?? {})]) {
      for (const [field, role] of [['dependencies','runtime'], ['dev-dependencies','development'], ['build-dependencies','build']]) {
        for (const [alias, spec] of Object.entries(scope[field] ?? {})) {
          if (mapping(spec) && (spec.path || spec.git || spec.workspace || spec.registry)) continue;
          const pkg = mapping(spec) && spec.package ? spec.package : alias;
          emit('cargo', spec?.optional ? 'optional' : role, pkg, field + '.' + alias + (pkg === alias ? '' : ' package=' + pkg));
        }
      }
    }
  } else if (name === 'go.mod') {
    const replaced = new Set();
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*(?:replace\s+)?([^\s]+)(?:\s+v[\w.+-]+)?\s*=>/.exec(line);
      if (match) replaced.add(match[1]);
    }
    let inRequire = false;
    for (const line of text.split(/\r?\n/)) {
      if (/^\s*require\s*\(/.test(line)) { inRequire = true; continue; }
      if (/^\s*\)/.test(line)) { inRequire = false; continue; }
      const dep = /^\s*(require\s+)?([^\s]+)\s+v[\w.+-]+\s*(?:\/\/.*)?$/.exec(line);
      if (dep && (inRequire || dep[1]) && !/\/\/\s*indirect\b/.test(line) &&
          !replaced.has(dep[2])) emit('gomod', 'direct', dep[2], line.trim());
    }
  } else if (name === 'composer.json') {
    const data = JSON.parse(text);
    if (data.name || data.require || data['require-dev'] || data.autoload)
      mark('phpcomposer', 'packagist', 'toolchain', 'composer.json with package data');
    for (const field of ['require','require-dev']) for (const pkg of Object.keys(data[field] ?? {}))
      emit('packagist', field === 'require' ? 'runtime' : 'development', pkg, field + '.' + pkg);
  } else if (name === 'pom.xml') {
    const els = xmlEntries(text), root = els[0];
    if (root?.tag !== 'project' || !['','http://maven.apache.org/POM/4.0.0','https://maven.apache.org/POM/4.0.0'].includes(root.ns)) return;
    if (root.fields.modelVersion) mark('maven', 'maven', 'toolchain', 'project/modelVersion = ' + root.fields.modelVersion);
    for (const el of els) {
      const route = el.chain.join('/');
      if (el.ns !== root.ns || !['project/dependencies/dependency','project/parent','project/build/plugins/plugin'].includes(route)) continue;
      const pkg = el.fields.groupId + ':' + el.fields.artifactId;
      emit('maven', route.startsWith('project/build') || el.tag === 'parent' ? 'build' :
        el.fields.scope === 'test' ? 'development' : 'direct', pkg, route + ' ' + pkg);
    }
  } else if (/\.(?:cs|fs|vb)proj$/.test(name)) {
    const els = xmlEntries(text), root = els[0];
    if (root?.tag !== 'Project') return;
    for (const el of els) {
      if (!el.conditional && el.chain.join('/') === 'Project/PropertyGroup/UseWPF' && el.value.trim().toLowerCase() === 'true')
        mark('wpf', 'nuget', 'platform', 'UseWPF = true');
      if (!el.conditional && el.chain.join('/') === 'Project/PropertyGroup/UseWinUI' && el.value.trim().toLowerCase() === 'true')
        mark('winui', 'nuget', 'platform', 'UseWinUI = true');
      if (el.ns !== root.ns || el.chain.join('/') !== 'Project/ItemGroup/PackageReference' || el.conditional) continue;
      const pkg = el.attributes.Include;
      if (typeof pkg === 'string') emit('nuget', 'direct', pkg, 'PackageReference Include=' + pkg);
    }
  } else if (name === 'pubspec.yaml') {
    const data = yaml(text);
    for (const field of ['dependencies','dev_dependencies']) for (const [pkg, constraint] of Object.entries(data?.[field] ?? {})) {
      if (mapping(constraint) && (constraint.path || constraint.git || constraint.hosted)) continue;
      if (['flutter','flutter_test'].includes(pkg) && constraint?.sdk !== 'flutter') continue;
      emit('pub', field === 'dependencies' ? 'runtime' : 'development', pkg, field + '.' + pkg);
    }
  } else if (name === 'Gemfile' || name.endsWith('.gemspec')) {
    for (const line of text.split(/\r?\n/)) {
      const gem = /^\s*(gem\s+|\w+\.add_(development_|runtime_)?dependency\s*\(?\s*)["']([\w-]+)["']/.exec(line);
      if (gem && !/\b(?:git|github|path):|\s(?:if|unless)\s/.test(line))
        emit('rubygems', gem[2] === 'development_' ? 'development' : 'direct', gem[3], line.trim());
    }
  } else if (name === 'mix.exs') {
    const body = /^\s*defp?\s+deps(?:\(\))?\s+do\b([^]*?)^\s*end\b/m.exec(text)?.[1];
    for (const line of body?.split(/\r?\n/) ?? []) {
      const dep = /^\s*\{:(\w+),\s*"(?:~>|>=|==|<=|[\d>])/.exec(line);
      if (dep && !/\b(?:git|github|path):/.test(line)) emit('hex', 'direct', dep[1], line.trim());
    }
  } else if (name === 'Package.swift') {
    for (const line of text.split(/\r?\n/)) {
      const dep = /^\s*\.package\(\s*(?:name:\s*"[^"]+",\s*)?url:\s*"https:\/\/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?"/.exec(line);
      if (dep) emit('swiftpm', 'direct', dep[1], line.trim());
    }
  } else if (name.startsWith('build.gradle')) {
    // Only unambiguous single-line literal declarations in these executable scripts.
    let block = '', depth = 0;
    for (const line of text.replace(/\/\*[^]*?\*\//g, '').split(/\r?\n/)) {
      const code = line.split('//')[0].trim();
      if (!depth && /^(?:plugins|dependencies)\s*\{\s*$/.test(code)) block = code.split(/\s|\{/)[0];
      if (block && depth === 1) {
        const dep = /^(implementation|api|testImplementation|compileOnly|runtimeOnly)\s*(?:\(\s*)?["']([\w.-]+:[\w.-]+):[^"']+["']\s*\)?\s*;?$/.exec(code);
        if (dep && block === 'dependencies') emit('maven', dep[1] === 'testImplementation' ? 'development' : 'direct', dep[2], code);
        if (block === 'plugins' && /^id\s*\(?\s*["']org\.springframework\.boot["']/.test(code) && !/\bapply\s*\(?\s*false/.test(code))
          mark('spring-boot', 'maven', 'build', code);
      }
      const android = /^(?:apply\s+plugin:\s*|id\s*\(?\s*)["'](com\.android\.(?:application|library))["']/.exec(code);
      if (android && !/\bapply\s*\(?\s*false/.test(code))
        mark('android', 'maven', 'platform', code);
      depth += (code.match(/\{/g) ?? []).length - (code.match(/\}/g) ?? []).length;
      if (!depth) block = '';
    }
    if (/^\s*(?:plugins|dependencies|repositories)\s*\{/m.test(text))
      mark('gradle', 'maven', 'toolchain', 'Gradle build script with a build configuration block');
  }
}

// Evidence from workflow structure and explicit imports is independent of package names.
function readConfiguration(file, text, mark) {
  if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(file)) {
    const data = yaml(text);
    if (mapping(data) && Object.hasOwn(data, 'on') && mapping(data.jobs) &&
        Object.values(data.jobs).some((job) => mapping(job) && (typeof job.uses === 'string' || Array.isArray(job.steps))))
      mark('github.actions','ci','automation','Workflow declares an event and a job with steps or uses');
  } else if (ciSystems.some((ci) => ci.config.test(file))) {
    const data = yaml(text);
    if (!mapping(data)) return;
    const ci = ciSystems.find((item) => item.config.test(file));
    const fields = {
      circleci: ['jobs','workflows','build'], travisci: ['language','jobs','script','install','matrix'],
      appveyor: ['image','build_script','test_script','environment','configuration','build'],
    }[ci.id];
    if (fields.some((field) => Object.hasOwn(data, field)))
      mark(ci.id,'ci','automation',file + ' declares ' + fields.filter((field) => Object.hasOwn(data, field)).join(', '));
  } else if (file.endsWith('.swift') && !text.includes('/*') && !text.includes('"""')) {
    for (const [pkg, id] of [['SwiftUI','swiftui'],['UIKit','uikit'],['MapKit','mapkit']]) {
      const statement = 'import ' + pkg;
      if (text.split(/\r?\n/).some((line) => line.trim() === statement))
        mark(id, 'swiftpm', 'source', statement);
    }
  } else if (file.endsWith('_test.exs') && !text.includes('"""') && !text.includes("'''") &&
      /^\s*use\s+ExUnit\.Case(?:\s*,[^\n]*)?\s*$/m.test(text)) {
    mark('exunit', 'hex', 'development', 'use ExUnit.Case');
  }
}

async function pathsAt(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    if (entry.isSymbolicLink() || entry.name === '.git') continue;
    const path = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await pathsAt(join(directory,entry.name),path + '/'));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

async function labelProject(project) {
  const directory = resolve(root, project.repo.replace('/', '--'));
  const files = await pathsAt(directory);
  const listed = new Map((inventory.get(project.repo) ?? []).map((item) => [item.path,item]));
  if (listed.size !== project.fileCount || files.length !== project.fileCount)
    throw new Error(project.repo + ': expected ' + project.fileCount + ' materialized files, found ' + files.length);
  const matches = new Map(), issues = [], excludedCI = new Set();
  let anchor, eligibleForAbsence = true;
  for (const file of files) {
    const bytes = await readFile(join(directory, file));
    const sha = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    if (sha !== listed.get(file)?.sha) throw new Error(project.repo + ': Git blob mismatch for ' + file);
    const name = basename(file), binary = bytes.subarray(0,8000).includes(0);
    const text = binary ? '' : bytes.toString('utf8');
    // A pipeline can be defined through external configuration. This control
    // measures absence of in-tree evidence only. Read documentation and examples
    // as well, vetoing an absence whenever a mention remains ambiguous.
    for (const ci of ciSystems) if (ci.config.test(file) || ci.mentions.test(file) || ci.mentions.test(text)) excludedCI.add(ci.id);
    if (binary && /\.(?:zip|tgz|tar|gz|7z|jar|nupkg|whl)$/i.test(file)) eligibleForAbsence = false;
    if (file.includes('{{') || file.split('/').slice(0,-1).some((part) => ignored.test(part)) || binary) continue;
    const mark = (id, ecosystem, role, evidence) => {
      const selected = matches.get(id);
      const row = {id,path:file,present:true,scope:'project',kind:'tech',ecosystem,role,evidence,blob:sha};
      // The project-product pair counts once. Prefer declarations over source,
      // then the shallowest path. Locale is irrelevant to the tie-breaker.
      const score = [supportedManifest.test(name) ? 0 : 1,file.split('/').length,file.length];
      if (!selected || score[0] < selected.score[0] || (score[0] === selected.score[0] &&
          (score[1] < selected.score[1] || (score[1] === selected.score[1] && score[2] < selected.score[2])))) {
        matches.set(id,{row,score});
      }
    };
    if (supportedManifest.test(name)) {
      if (!anchor || file.split('/').length < anchor.path.split('/').length) anchor = {path:file,blob:sha};
      try { readDeclarations(file,text,mark); }
      catch (error) { issues.push({path:file,error:String(error.message).split('\n')[0]}); }
    }
    try { readConfiguration(file,text,mark); }
    catch (error) { issues.push({path:file,error:String(error.message).split('\n')[0]}); }
  }
  const expected = [...matches.values()].map(({row}) => row);
  const absent = ciSystems.filter(({id}) => !excludedCI.has(id) && !matches.has(id));
  if (anchor && eligibleForAbsence && absent.length && !issues.length) {
    // One counterexample per eligible checkout caps the number of easy negatives.
    const ci = absent[Number.parseInt(project.tree.slice(0,8),16) % absent.length];
    expected.push({id:ci.id,...anchor,present:false,scope:'project',kind:'tech',ecosystem:'ci',role:'negative-control',
      evidence:'Whole tracked tree has no matching CI definition, pathname, or textual reference to ' + ci.id + '. Path identifies the audited checkout.'});
  }
  expected.sort((a,b) => a.id < b.id ? -1 : 1);
  return {...project,files:inventory.get(project.repo),expected,oracleWarnings:issues};
}

const labelled = [];
for (const project of source) labelled.push(await labelProject(project));
await writeFile(output,JSON.stringify(labelled,null,2) + '\n');
const stats = {projects:labelled.length, projectsWithPositives:0, positive:0, negative:0, warnings:0, byEcosystem:{}, byRole:{}};
for (const item of labelled) {
  if (item.expected.some((label) => label.present)) stats.projectsWithPositives++;
  stats.warnings += item.oracleWarnings.length;
  for (const label of item.expected) {
    if (!label.present) { stats.negative++; continue; }
    stats.positive++;
    stats.byEcosystem[label.ecosystem] = (stats.byEcosystem[label.ecosystem] ?? 0) + 1;
    stats.byRole[label.role] = (stats.byRole[label.role] ?? 0) + 1;
  }
}
console.log(JSON.stringify(stats,null,2));
