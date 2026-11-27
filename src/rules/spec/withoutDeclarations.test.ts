import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import '../../autoload.js';
import { analyser } from '../../analyser/index.js';
import { flatten } from '../../payload/helpers.js';
import { FakeProvider } from '../../provider/fake.js';
import { FSProvider } from '../../provider/fs.js';

import type { Payload } from '../../payload/index.js';

// What a project's own files say, without the declarations another tool used to send: build tools, and the
// requirements that only those declarations carried.
async function scan(files: Record<string, string>): Promise<Payload> {
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

describe('build tools', () => {
  it('should name CMake, autotools, the .NET SDK and Mix from their project files', async () => {
    const result = await scan({
      'native/CMakeLists.txt': 'cmake_minimum_required(VERSION 3.20)\nproject(demo C)\n',
      'legacy/configure.ac': 'AC_INIT([demo], [1.0])\n',
      'api/Api.csproj': '<Project Sdk="Microsoft.NET.Sdk"></Project>',
      'elixir/mix.exs': 'defmodule Demo.MixProject do\n  use Mix.Project\nend\n',
    });

    expect([...result.techs]).toEqual(
      expect.arrayContaining(['cmake', 'autotools', 'dotnet', 'nuget', 'mix', 'elixir'])
    );
  });

  it('should name sbt and read the literal module IDs of the .sbt files, not a computed one', async () => {
    const result = await scan({
      'build.sbt': [
        'ThisBuild / scalaVersion := "3.3.4"',
        'lazy val core = (project in file("core")).settings(',
        '  libraryDependencies ++= Seq(',
        '    "org.typelevel" %% "cats-core" % "2.12.0", // the version is a literal',
        '    "org.scalatest" %% "scalatest" % scalatestVersion % Test,',
        '    /* "com.h2database" % "h2" % "2.0" */',
        '    s"com.example" % name.value % "1"',
        '  )',
        ')',
      ].join('\n'),
      'project/plugins.sbt': 'addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.5.2")\n',
    });

    expect([...result.techs]).toEqual(expect.arrayContaining(['sbt', 'cats', 'scalatest']));
    expect(result.techs.has('h2')).toBe(false);
    expect(result.dependencies).toEqual(
      expect.arrayContaining([
        ['maven', 'org.typelevel:cats-core', '2.12.0'],
        ['maven', 'org.scalatest:scalatest', ''],
        ['maven', 'org.scalameta:sbt-scalafmt', '2.5.2'],
      ])
    );
    expect(result.dependencies.some(([, name]) => name.startsWith('com.example'))).toBe(false);
  });
});

describe('maven, Gradle and MSBuild manifests', () => {
  it('should read the dependencies of a Maven profile', async () => {
    const result = await scan({
      'pom.xml': [
        '<project xmlns="http://maven.apache.org/POM/4.0.0"><artifactId>app</artifactId><profiles>',
        '<profile><id>dev</id><dependencies><dependency><groupId>com.h2database</groupId><artifactId>h2</artifactId>',
        '</dependency></dependencies></profile>',
        '<profile><id>prod</id><dependencies><dependency><groupId>org.postgresql</groupId>',
        '<artifactId>postgresql</artifactId></dependency></dependencies></profile>',
        '</profiles></project>',
      ].join(''),
    });

    expect([...result.techs]).toEqual(expect.arrayContaining(['maven', 'h2', 'postgresql']));
  });

  it('should read Gradle declarations in an if or else branch and over continued lines, not a computed one', async () => {
    const result = await scan({
      'build.gradle': [
        "def modules = ['core', 'databind']",
        'dependencies {',
        '    modules.each { module ->',
        '        implementation "com.fasterxml.jackson.core:jackson-${module}:${jacksonVersion}"',
        '    }',
        "    if (findProperty('offline')) {",
        "        implementation fileTree(dir: 'libs', include: '*.jar')",
        '    } else {',
        '        implementation "io.grpc:grpc-stub:1.0",',
        '                "io.prometheus:prometheus-metrics-core:${prometheusVersion}"',
        '        runtimeOnly "com.fasterxml.jackson.core:jackson-databind:${jacksonVersion}"',
        '    }',
        '}',
        'subprojects {',
        '    dependencies {',
        "        implementation 'com.h2database:h2:2.0'",
        '    }',
        '}',
      ].join('\n'),
    });

    expect(result.dependencies).toEqual(
      expect.arrayContaining([
        ['maven', 'io.grpc:grpc-stub', '1.0'],
        ['maven', 'io.prometheus:prometheus-metrics-core', ''],
        ['maven', 'com.fasterxml.jackson.core:jackson-databind', ''],
      ])
    );
    expect([...result.techs]).toEqual(
      expect.arrayContaining(['gradle', 'grpc', 'prometheus', 'jackson'])
    );
    expect(result.techs.has('h2')).toBe(false);
    expect(result.dependencies.some(([, name]) => name.includes('${'))).toBe(false);
  });

  it('should take a project SDK as a NuGet package', async () => {
    const result = await scan({
      'UnitTests/UnitTests.csproj': '<Project Sdk="MSTest.Sdk/4.0.2"></Project>',
      'AppHost/AppHost.csproj':
        '<Project Sdk="Microsoft.NET.Sdk"><Sdk Name="Aspire.AppHost.Sdk" Version="9.0.0"/></Project>',
    });

    expect([...result.techs]).toEqual(
      expect.arrayContaining(['mstest', 'dotnet-aspire', 'dotnet'])
    );
  });
});

describe('python manifests', () => {
  it('should read Hatch environments, PDM development groups and uv development requirements', async () => {
    const result = await scan({
      'hatch/pyproject.toml': [
        '[project]',
        'name = "a"',
        'dependencies = ["rich>=13"]',
        '[tool.hatch.envs.default]',
        'dependencies = ["pytest>=8"]',
        '[tool.hatch.envs.lint]',
        'extra-dependencies = ["ruff>=0.6"]',
      ].join('\n'),
      'pdm/pyproject.toml': [
        '[project]',
        'name = "b"',
        '[tool.pdm.dev-dependencies]',
        'dev = ["click>=8"]',
      ].join('\n'),
      'uv/pyproject.toml': [
        '[project]',
        'name = "c"',
        '[tool.uv]',
        'dev-dependencies = ["numpy>=2"]',
      ].join('\n'),
    });

    expect([...result.techs]).toEqual(expect.arrayContaining(['pytest', 'ruff', 'click', 'numpy']));
  });

  it('should read requirements files by the names pip users give them, and no other text file', async () => {
    const result = await scan({
      'dev-requirements.txt': 'ruff==0.6.9\n    # via -r dev-requirements.in\n',
      'requirements-dev.txt': '-r requirements.txt\npytest==8.3.3\n',
      'requirements/base.txt': 'click==8.1.7\nnumpy>=1.26 ; python_version >= "3.9"\n',
      'notes.txt': 'django==5.0\n',
    });

    expect([...result.techs]).toEqual(expect.arrayContaining(['ruff', 'pytest', 'click', 'numpy']));
    expect(result.techs.has('django')).toBe(false);
  });

  it('should read a Pipfile, without its local paths', async () => {
    const result = await scan({
      Pipfile: [
        '[packages]',
        'click = "==8.1.7"',
        'requests = {version = ">=2", extras = ["socks"]}',
        'numpy = {path = "./numpy"}',
        '[dev-packages]',
        'ruff = "*"',
      ].join('\n'),
    });

    expect([...result.techs]).toEqual(expect.arrayContaining(['click', 'requests', 'ruff']));
    expect(result.techs.has('numpy')).toBe(false);
    expect(result.dependencies).toContainEqual(['python', 'ruff', 'latest']);
  });

  it('should read install_requires and extras_require of setup.cfg', async () => {
    const result = await scan({
      'setup.cfg': [
        '[metadata]',
        'name = lib',
        '[options]',
        'package_dir =',
        '    = src',
        'install_requires =',
        '    requests>=2',
        '    typing-extensions>=4.5; python_version < "3.11"',
        '# a comment',
        '[options.extras_require]',
        'cli =',
        '    click>=8',
        'docs = sphinx>=7',
        '[flake8]',
        'max-line-length = 100',
      ].join('\n'),
    });

    expect([...result.techs]).toEqual(expect.arrayContaining(['requests', 'click', 'sphinx']));
  });

  it('should read the literal requirements of setup.py and never a computed list', async () => {
    const literal = await scan({
      'setup.py': [
        'from setuptools import setup',
        '# install_requires=["django"]',
        "setup(name='t', install_requires=['requests>=2.20', \"six\"], extras_require={'yaml': [\"PyYAML>=5.1\"]})",
      ].join('\n'),
    });

    expect([...literal.techs]).toEqual(expect.arrayContaining(['requests', 'pyyaml']));
    expect(literal.techs.has('django')).toBe(false);

    const computed = await scan({
      'setup.py': [
        'from setuptools import setup',
        "setup(install_requires=[line for line in open('requirements.in')] + ['numpy'], extras_require=EXTRAS)",
      ].join('\n'),
    });

    expect(computed.techs.has('numpy')).toBe(false);
  });
});

describe('local dependencies inside and outside the copy', () => {
  async function project(files: Record<string, string>): Promise<Payload> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-local-'));
    for (const [name, text] of Object.entries(files)) {
      await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await fs.writeFile(path.join(root, name), text);
    }
    try {
      return flatten(
        await analyser({ provider: new FSProvider({ path: path.join(root, 'copy') }) }),
        { merge: true }
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }
  const goMod = (target: string): string =>
    [
      'module example.com/app',
      'go 1.22',
      'require github.com/getsentry/sentry-go v0.30.0',
      `replace github.com/getsentry/sentry-go => ${target}`,
    ].join('\n');

  it('should not take a Go module replaced by a folder of the copy as external', async () => {
    const result = await project({
      'copy/go.mod': goMod('./third_party/sentry'),
      'copy/third_party/sentry/go.mod': 'module x\n',
    });

    expect(result.techs.has('sentry')).toBe(false);
    expect(result.dependencies).toContainEqual([
      'golang',
      'github.com/getsentry/sentry-go',
      './third_party/sentry',
    ]);
  });

  it('should read a Go module replaced by a folder outside the copy as before', async () => {
    const result = await project({
      'copy/go.mod': goMod('../outside/sentry'),
      'outside/sentry/go.mod': 'module x\n',
    });

    expect(result.techs.has('sentry')).toBe(true);
  });

  it('should not apply a Go replacement for another version', async () => {
    const result = await project({
      'copy/go.mod': goMod('./sentry').replace('sentry-go =>', 'sentry-go v0.1.0 =>'),
    });

    expect(result.techs.has('sentry')).toBe(true);
  });

  const composer = (url: string): string =>
    JSON.stringify({
      name: 'acme/app',
      require: { 'sentry/sentry': '*@dev' },
      repositories: [{ type: 'path', url }],
    });
  const sentry = JSON.stringify({ name: 'Sentry/Sentry' });

  it('should not take a Composer package from a path repository inside the copy as external', async () => {
    const result = await project({
      'copy/composer.json': composer('packages/*'),
      'copy/packages/sentry/composer.json': sentry,
    });

    expect(result.techs.has('sentry')).toBe(false);
    expect(result.dependencies).toContainEqual(['php', 'sentry/sentry', '*@dev']);
  });

  it('should read a Composer path repository outside the copy as before', async () => {
    const result = await project({
      'copy/composer.json': composer('../outside/*'),
      'outside/sentry/composer.json': sentry,
    });

    expect(result.techs.has('sentry')).toBe(true);
  });
});
