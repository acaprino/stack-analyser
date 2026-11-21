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
