import path from 'node:path';

import { expect, it } from 'vitest';

import '../../autoload.js';
import { analyser } from '../../analyser/index.js';
import { flatten } from '../../payload/helpers.js';
import { FakeProvider } from '../../provider/fake.js';
import { mavenProject } from './jvm/maven.js';
import { gradleDependencies } from './jvm/gradle.js';

async function scan(files: Record<string, string>) {
  const dirs = new Map<string, Set<string>>();
  for (const file of Object.keys(files)) {
    let folder = '/';
    const parts = file.split('/');
    for (const [i, part] of parts.entries()) {
      const dir = dirs.get(folder) ?? new Set<string>();
      dir.add(i === parts.length - 1 ? part : `${part}/`);
      dirs.set(folder, dir);
      folder = path.posix.join(folder, part);
    }
  }
  const provider = new FakeProvider({
    paths: Object.fromEntries([...dirs].map(([dir, entries]) => [dir, [...entries]])),
    files: Object.fromEntries(Object.entries(files).map(([name, text]) => ['/' + name, text])),
  });
  return flatten(await analyser({ provider }), { merge: true });
}

it('matches the npm registry target of an alias, retaining local declarations without classifying their names', async () => {
  const result = await scan({ 'package.json': JSON.stringify({
    name: 'demo', dependencies: { react: 'npm:preact@10', 'renamed-vite': 'npm:vite@^6', vue: 'file:../vue',
      angular: 'workspace:*', 'test-alias': 'npm:@playwright/test@1', zod: 'link:./fake' },
  }) });
  expect([...result.techs]).toEqual(expect.arrayContaining(['preactjs', 'vite', 'playwright']));
  for (const id of ['react', 'vuejs', 'angular', 'zod']) expect([...result.techs]).not.toContain(id);
  expect(result.dependencies).toContainEqual(['npm', 'vue', 'file:../vue']);
});

it('reads dependencies from an unnamed private npm project and tolerates non-object manifests', async () => {
  const result = await scan({ 'package.json': 'null', 'app/package.json': '{"private":true,"dependencies":{"react":"^19"}}' });
  expect([...result.techs]).toContain('react');
});

it('reads Python dependency groups and Poetry tables, retaining extras and ignoring local Poetry projects', async () => {
  const result = await scan({ 'pyproject.toml': `[dependency-groups]\ntest = ["pytest>=7", {include-group="web"}]\nweb = ["fastapi[standard] (>=0.100)"]\n[tool.poetry.dependencies]\npython="^3.11"\nflask="^3"\ndjango={path="../django"}\n[tool.poetry.group.optional.dependencies]\npydantic={version="^2",optional=true}\n` });
  expect([...result.techs]).toEqual(expect.arrayContaining(['pytest', 'fastapi', 'flask', 'pydantic']));
  expect([...result.techs]).not.toContain('django');
  expect(result.dependencies).toContainEqual(['python', 'fastapi', '0.100']);
});

it('leaves out the Python distributions that uv takes from the workspace or a local path', async () => {
  const result = await scan({ 'pyproject.toml': `[project]
name = "app"
dependencies = ["sentry-sdk>=2", "Django", "fastapi", "flask", "pydantic"]
[dependency-groups]
test = ["pytest"]
[tool.uv.sources]
sentry_sdk = { workspace = true }
django = { path = "../django", editable = true }
fastapi = { git = "https://github.com/fastapi/fastapi" }
flask = { index = "internal" }
pydantic = { url = "https://example.com/pydantic-2.0-py3-none-any.whl" }
pytest = [{ path = "../pytest", marker = "sys_platform == 'linux'" }, { index = "pypi", marker = "sys_platform != 'linux'" }]
` });
  expect([...result.techs]).toEqual(expect.arrayContaining(['fastapi', 'flask', 'pydantic', 'pytest']));
  for (const id of ['sentry', 'django']) expect([...result.techs]).not.toContain(id);
});

it('leaves out a Python distribution referenced by a file URL, as PDM writes a path', async () => {
  const result = await scan({
    'pyproject.toml': '[project]\nname = "app"\ndependencies = ["requests @ file:///${PROJECT_ROOT}/../requests", "fastapi"]\n',
    'svc/requirements.txt': 'httpx @ file:///srv/httpx ; python_version >= "3.8"\ncelery==5\n',
  });
  expect([...result.techs]).toEqual(expect.arrayContaining(['fastapi', 'celery']));
  for (const id of ['requests', 'httpx']) expect([...result.techs]).not.toContain(id);
});

it('invalid pyproject metadata cannot abort analysis of independent projects', async () => {
  const result = await scan({ 'pyproject.toml': 'project = "invalid"', 'app/requirements.txt': 'pytest==8' });
  expect([...result.techs]).toContain('pytest');
});

it('resolves Cargo workspace aliases and avoids reporting a same-name local workspace dependency', async () => {
  const result = await scan({ 'Cargo.toml': '[workspace]\nmembers=["app"]\n[workspace.dependencies]\ntokio={path="local/tokio"}\nx={package="serde",version="1"}\naxum="0.8"',
    'app/Cargo.toml': '[package]\nname="app"\nversion="1"\nlicense.workspace=true\n[dependencies]\ntokio.workspace=true\nx.workspace=true' });
  expect([...result.techs]).toContain('serde');
  expect([...result.techs]).not.toContain('tokio');
  expect([...result.techs]).not.toContain('axum');
});

it('keeps foreign XML out of a Maven POM and resolves nested local properties', () => {
  const pom = '<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:doc="urn:example"><artifactId>app</artifactId>' +
    '<properties><base>org.springframework</base><group>${base}.boot</group></properties><dependencies>' +
    '<dependency><groupId>${group}</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>' +
    '<doc:dependency><doc:groupId>example</doc:groupId><doc:artifactId>documentation</doc:artifactId></doc:dependency>' +
    '</dependencies></project>';
  expect(mavenProject(pom)?.dependencies).toEqual([['maven', 'org.springframework.boot:spring-boot-starter-web', '']]);
  expect(mavenProject('<project xmlns="urn:example"><artifactId>app</artifactId></project>')).toBeNull();
});

it('ignores statically inactive NuGet declarations and removed entries, retaining target-specific declarations', async () => {
  const result = await scan({ 'App.csproj': '<Project><ItemGroup Condition="false"><PackageReference Include="MudBlazor"/></ItemGroup>' +
    '<ItemGroup><PackageReference Include="Serilog"/><PackageReference Remove="serilog"/>' +
    '<PackageReference Condition="false" Include="MediatR"/></ItemGroup>' +
    '<Choose><When Condition="true"><ItemGroup><PackageReference Include="xunit"/></ItemGroup></When>' +
    '<Otherwise><ItemGroup><PackageReference Include="Npgsql"/></ItemGroup></Otherwise></Choose>' +
    '<ItemGroup Condition="\'$(TargetFramework)\' == \'net9.0\'"><PackageReference Include="OptionalTarget"/></ItemGroup></Project>' });
  expect(result.dependencies.map((d) => d[1]).sort()).toEqual(['OptionalTarget', 'xunit']);
});

it('reads dependencies declared in a Kotlin source set and ignores conditional or sibling blocks', () => {
  const source = `kotlin { sourceSets {
    commonMain.dependencies { implementation("com.example:shared:1") }
    val jvmTest by getting { dependencies { implementation("com.example:tests:2") } }
    if (enabled) { dependencies { implementation("com.example:conditional:1") } }
    else { dependencies { implementation("com.example:alternative:1") } }
  } }
  subprojects { dependencies { implementation("com.example:sibling:1") } }
  apply(plugin = "org.springframework.boot" + suffix)`;
  expect(gradleDependencies(source, new Map())).toEqual([
    ['maven', 'com.example:shared', '1'], ['maven', 'com.example:tests', '2'],
  ]);
});

it('records where each package, image, action and resource was declared', async () => {
  const result = await scan({
    'package.json': JSON.stringify({ name: 'api', dependencies: { react: '18', pg: '8' } }),
    'docker-compose.yml': 'services:\n  cache:\n    image: redis:7\n',
    '.github/workflows/ci.yml': 'on: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n',
    'main.tf': 'resource "aws_s3_bucket" "b" {}\n',
  });
  const all = [result, ...result.childs].flatMap((c) => c.toJson('').evidence);
  expect(all).toEqual(expect.arrayContaining([
    { tech: 'react', kind: 'package', value: 'react', path: '/package.json', source: 'stack-analyser' },
    { tech: 'postgresql', kind: 'package', value: 'pg', path: '/package.json', source: 'stack-analyser' },
    { tech: 'redis', kind: 'image', value: 'redis', path: '/docker-compose.yml', source: 'stack-analyser' },
    { tech: 'nodejs', kind: 'action', value: 'actions/setup-node', path: '/.github/workflows/ci.yml', source: 'stack-analyser' },
    { tech: 'aws.s3', kind: 'terraform', value: 'aws_s3_bucket', path: '/main.tf', source: 'stack-analyser' },
  ]));
});

it('records the manifest of every other ecosystem that declares packages or images', async () => {
  const result = await scan({
    'requirements.txt': 'pytest==8\n',
    'py/pyproject.toml': '[project]\nname = "svc"\ndependencies = ["fastapi>=0.100"]\n',
    'go.mod': 'module example.com/app\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.9.0\n',
    'rs/Cargo.toml': '[package]\nname = "app"\nversion = "1.0.0"\n[dependencies]\ntokio = "1"\n',
    'Dockerfile': 'FROM node:20\n',
    'java/pom.xml': '<project xmlns="http://maven.apache.org/POM/4.0.0"><artifactId>app</artifactId><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>',
  });
  const all = result.toJson('').evidence;
  expect(all).toEqual(expect.arrayContaining([
    { tech: 'pytest', kind: 'package', value: 'pytest', path: '/requirements.txt', source: 'stack-analyser' },
    { tech: 'fastapi', kind: 'package', value: 'fastapi', path: '/py/pyproject.toml', source: 'stack-analyser' },
    { tech: 'gin', kind: 'package', value: 'github.com/gin-gonic/gin', path: '/go.mod', source: 'stack-analyser' },
    { tech: 'tokio', kind: 'package', value: 'tokio', path: '/rs/Cargo.toml', source: 'stack-analyser' },
    { tech: 'nodejs', kind: 'image', value: 'node', path: '/Dockerfile', source: 'stack-analyser' },
    { tech: 'spring-boot', kind: 'package', value: 'org.springframework.boot:spring-boot-starter-web', path: '/java/pom.xml', source: 'stack-analyser' },
  ]));
});

it('records an image as the file writes it, and its dependency as the rules compare it', async () => {
  const result = await scan({
    'Dockerfile': 'FROM docker.io/library/node:20\n',
    'docker-compose.yml': 'services:\n  db:\n    image: registry-1.docker.io/bitnami/postgresql:16\n',
    '.github/workflows/ci.yml': 'on: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    container: index.docker.io/library/redis:7\n',
  });
  const all = [result, ...result.childs].flatMap((c) => c.toJson('').evidence);
  expect(all).toEqual(expect.arrayContaining([
    { tech: 'nodejs', kind: 'image', value: 'docker.io/library/node', path: '/Dockerfile', source: 'stack-analyser' },
    { tech: 'postgresql', kind: 'image', value: 'registry-1.docker.io/bitnami/postgresql', path: '/docker-compose.yml', source: 'stack-analyser' },
    { tech: 'redis', kind: 'image', value: 'index.docker.io/library/redis', path: '/.github/workflows/ci.yml', source: 'stack-analyser' },
  ]));
  expect(result.dependencies).toEqual(expect.arrayContaining([
    ['docker', 'node', '20'], ['docker', 'bitnami/postgresql', '16'], ['docker', 'redis', '7'],
  ]));
});

// The registry lists these file names and source constructs as signs; the fork reads them itself, from the file,
// without a rule that names them.
const compose = 'services:\n  cache:\n    image: redis:7\n';
it.each([
  ['Dockerfile', 'FROM node:20\n'],
  ['docker-compose.yml', compose],
  ['docker-compose.yaml', compose],
])('reads docker from the file %s', async (name, content) => {
  const result = await scan({ [name]: content });
  const all = [result, ...result.childs].flatMap((c) => c.toJson('').evidence);
  expect(result.techs.has('docker')).toBe(true);
  expect(all).toContainEqual({ tech: 'docker', kind: 'file', value: name, path: `/${name}`, source: 'stack-analyser' });
});

it.each([
  ['exunit', 'ExUnit.start', 'test_helper.exs', 'ExUnit.start()\n'],
  ['exunit', 'ExUnit.configuration', 'test_helper.exs', 'ExUnit.configuration(trace: true)\n'],
  ['swiftui', 'SwiftUI', 'View.swift', 'import SwiftUI\n'],
  ['uikit', 'UIKit', 'View.swift', 'import UIKit\n'],
  ['mapkit', 'MapKit', 'View.swift', 'import MapKit\n'],
  ['flutter', 'Flutter', 'View.swift', 'import Flutter\n'],
  ['firebase', 'FirebaseCore', 'View.swift', 'import FirebaseCore\n'],
  ['firebase', 'FirebaseMessaging', 'View.swift', 'import FirebaseMessaging\n'],
] as const)('reads %s from %s in a source file', async (tech, value, name, content) => {
  const result = await scan({ [name]: content });
  const all = [result, ...result.childs].flatMap((c) => c.toJson('').evidence);
  expect(result.techs.has(tech)).toBe(true);
  expect(all).toContainEqual({ tech, kind: 'source', value, path: `/${name}`, line: 1, source: 'stack-analyser' });
});
