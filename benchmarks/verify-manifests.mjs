// Run the shipped CLI against inert hand-written manifests with both package builds.
// node benchmarks/verify-manifests.mjs UPSTREAM_PACKAGE EXTENDED_PACKAGE
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const [baseline, candidate, workspace] = process.argv.slice(2);
if (!candidate) throw new Error('Expected an upstream and an extended package directory');
const exec = promisify(execFile);
const pom = (xml) => `<project><modelVersion>4.0.0</modelVersion><groupId>test</groupId>
  <artifactId>sample</artifactId><version>1</version>${xml}</project>`;
const gav = (group, artifact, version = '3.4.0') => `<dependency><groupId>${group}</groupId>
  <artifactId>${artifact}</artifactId><version>${version}</version></dependency>`;
const starter = gav('org.springframework.boot', 'spring-boot-starter-web');
const mvc = gav('org.springframework', 'spring-webmvc', '6.2.0');
const fixtures = [
  { name: 'maven-starter', files: { 'pom.xml': pom(`<dependencies>${starter}${mvc}</dependencies>`) },
    yes: ['spring-boot', 'spring-mvc'] },
  { name: 'gradle-plugin', files: { 'build.gradle.kts': 'plugins { id("org.springframework.boot") version "3.4.0" }' },
    yes: ['spring-boot'] },
  { name: 'maven-lookalikes', files: { 'pom.xml': pom(
    `<dependencies>${gav('example.mirror', 'spring-boot-starter-web')}</dependencies>` +
    `<dependencyManagement><dependencies>${starter}${mvc}</dependencies></dependencyManagement>`) },
    no: ['spring-boot', 'spring-mvc'] },
  { name: 'nuget', files: { 'Sample.csproj': '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup>' +
    '<TargetFramework>net8.0-windows10.0.19041.0</TargetFramework><UseWinUI>true</UseWinUI></PropertyGroup><ItemGroup>' +
    '<PackageReference Include="Microsoft.EntityFrameworkCore" Version="9.0.0" /></ItemGroup></Project>' },
    yes: ['entity-framework-core', 'winui'] },
  { name: 'web', files: { 'package.json': JSON.stringify({ name: 'demo', version: '1.0.0',
    dependencies: { 'vite-plus': '1', 'react-dom': '19', '@azure/storage-blob': '12' } }) },
    yes: ['vite-plus', 'react-dom', 'azure.blobstorage'] },
  { name: 'plain-vite', files: { 'package.json': JSON.stringify({ name: 'demo', version: '1.0.0',
    dependencies: { vite: '6', 'react-dom-lookalike': '1' } }),
    'docker-compose.yml': 'services:\n  db:\n    image: private.example:5000/unrelated/redis:7\n',
    'Dockerfile': 'FROM private.example:5000/valkey/valkey:8\n',
    'maestro/flows/notes.yaml': 'appId: sample.mobile\nnotes: launchApp\n' },
    yes: ['vite'], no: ['vite-plus', 'react-dom', 'redis', 'valkey', 'maestro'] },
  { name: 'polyglot', files: {
    'mobile/pubspec.yaml': 'name: sample\ndependencies:\n  flutter:\n    sdk: flutter\n',
    'api/requirements.txt': 'djangorestframework>=3.15\n',
    'cli/Cargo.toml': '[package]\nname="sample"\nversion="0.1.0"\n[dependencies]\nflags={package="clap",version="4"}\n',
    'infra/docker-compose.yml': 'services:\n  db:\n    image: docker.io/library/redis:7\n',
    'infra/Dockerfile': 'FROM docker.io/valkey/valkey:8 AS cache\nFROM cache\n',
    'mobile/maestro/flows/launch.yml': 'appId: sample.mobile\n---\n- launchApp\n',
  }, yes: ['flutter', 'django-rest-framework', 'clap', 'redis', 'valkey', 'maestro'] },
];

function technologies(payload) {
  const ids = new Set(payload.techs ?? []);
  if (payload.tech) ids.add(payload.tech);
  for (const child of payload.childs ?? []) for (const id of technologies(child)) ids.add(id);
  return ids;
}

async function cli(root, project, work) {
  await mkdir(work);
  await exec(process.execPath, [resolve(root, 'dist/cli.js'), project, '--output=out.json'],
             { cwd: work, timeout: 30000, windowsHide: true });
  return technologies(JSON.parse(await readFile(join(work, 'out.json'), 'utf8')));
}

async function compare(project, work) {
  return Promise.all([
    cli(baseline, project, work + '-before'), cli(candidate, project, work + '-after'),
  ]);
}

async function workspaceCheck(temp) {
  const cases = JSON.parse(await readFile(new URL('workspace-manifests.json', import.meta.url), 'utf8'));
  for (const [repo, manifests] of Object.entries(cases)) {
    const tree = join(temp, repo);
    for (const rel of Object.keys(manifests)) {
      await mkdir(dirname(join(tree, rel)), { recursive: true });
      await copyFile(join(workspace, repo, rel), join(tree, rel));
    }
    const [oldTree, newTree] = await compare(tree, tree);
    const totals = { expected: 0, before: 0, after: 0 };
    let index = 0;
    for (const [rel, wanted] of Object.entries(manifests)) {
      // Specfy can merge children into a shared parent. Re-run each unchanged declaration in isolation
      // to verify that the named module alone accounts for the technology that appeared in its tree.
      const isolated = join(temp, `${repo}-module-${index++}`);
      await mkdir(dirname(join(isolated, rel)), { recursive: true });
      await copyFile(join(tree, rel), join(isolated, rel));
      const [oldModule, newModule] = await compare(isolated, isolated);
      const before = wanted.filter((id) => oldTree.has(id) && oldModule.has(id));
      const after = wanted.filter((id) => newTree.has(id) && newModule.has(id));
      const missing = wanted.filter((id) => !after.includes(id));
      console.log(JSON.stringify({ repo, manifest: rel, before, after, missing }));
      totals.expected += wanted.length;
      totals.before += before.length;
      totals.after += after.length;
    }
    console.log(JSON.stringify({ repo, totals }));
    assert.equal(totals.after, totals.expected, `${repo}: expected technology IDs are missing`);
  }
}

const temp = await mkdtemp(join(tmpdir(), 'stack-analyser-fixtures-'));
try {
  for (const fixture of fixtures) {
    const project = join(temp, fixture.name);
    await mkdir(project);
    for (const [name, content] of Object.entries(fixture.files)) {
      const file = join(project, name);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, content);
    }
    const [before, after] = await compare(project, project);
    const relevant = [...fixture.yes ?? [], ...fixture.no ?? []];
    console.log(JSON.stringify({ fixture: fixture.name, before: relevant.filter((id) => before.has(id)),
                                after: relevant.filter((id) => after.has(id)) }));
    for (const id of fixture.yes ?? []) assert(after.has(id), `${fixture.name} missed ${id}`);
    for (const id of fixture.no ?? []) assert(!after.has(id), `${fixture.name} falsely identified ${id}`);
  }
  if (workspace) await workspaceCheck(temp);
} finally {
  await rm(temp, { recursive: true, force: true });
}
