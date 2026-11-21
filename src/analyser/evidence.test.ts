import path from 'node:path';
import { expect, it } from 'vitest';
import { analyser } from './index.js';
import { FSProvider } from '../provider/fs.js';
import { FakeProvider } from '../provider/fake.js';
import '../autoload.js';

import type { AnalyserJson } from '../types/index.js';

const root = path.join(import.meta.dirname, '../../tests/__fixtures__');

/** Every technology of a component with no evidence behind it, as `component: tech`. */
function withoutEvidence(graph: AnalyserJson): string[] {
  const missing: string[] = [];
  const visit = (node: AnalyserJson) => {
    for (const id of node.tech ? [node.tech, ...node.techs] : node.techs) {
      if (!node.evidence.some((item) => item.tech === id)) missing.push(`${node.name}: ${id}`);
    }
    for (const item of node.evidence) {
      expect(item.path.startsWith('/'), item.path).toBe(true);
      expect(item.path).not.toMatch(/\\|^\/[A-Za-z]:/);
    }
    node.childs.forEach(visit);
  };
  visit(graph);
  return missing;
}

function allEvidence(graph: AnalyserJson): AnalyserJson['evidence'] {
  return [...graph.evidence, ...graph.childs.flatMap(allEvidence)];
}

it('every technology carries evidence', async () => {
  const graph = (await analyser({ provider: new FSProvider({ path: root }) })).toJson(root);
  expect(withoutEvidence(graph)).toEqual([]);
});

it('records the file, extension, variable or source behind a hand-written reason', async () => {
  const files: Record<string, string> = {
    '/elixir/mix.exs': 'defmodule Demo.MixProject do\n  def project, do: [app: :demo, deps: []]\nend\n',
    '/elixir/test_helper.exs': 'defmodule T do\nend\nExUnit.start()\n',
    '/swift/Package.swift': 'let package = Package(name: "Mobile", dependencies: [])\n',
    '/swift/View.swift': 'import Foundation\nimport SwiftUI\n',
    '/maven/pom.xml': '<project xmlns="http://maven.apache.org/POM/4.0.0"><artifactId>app</artifactId></project>',
    '/gradle/build.gradle': 'plugins { id "java" }\n',
    '/mobile/.maestro/smoke.yaml': 'appId: com.example\n---\n- launchApp\n',
    '/dotnet/Desktop.csproj': '<Project><PropertyGroup><UseWinUI>true</UseWinUI></PropertyGroup></Project>',
    '/php/composer.json': '{"name": "acme/app", "require": {}}',
    '/dart/pubspec.yaml': 'name: reader\ndependencies:\n  test: ^1.2\n',
    '/gemspec/demo.gemspec': "Gem::Specification.new do |s|\n  s.add_dependency 'rails'\nend\n",
    '/bundler/Gemfile': "gem 'rails'\n",
    '/locked/Gemfile.lock': 'GEM\n  specs:\n    rails (7.0.0)\n\nDEPENDENCIES\n  rails\n',
    '/rust/Cargo.toml': '[package]\nname = "demo"\nversion = "1.0.0"\n',
    '/ui/components.json': '{"$schema": "https://ui.shadcn.com/schema.json"}',
    '/go/cmd/server/main.go': 'package main\n',
    '/compose/docker-compose.yml': 'services:\n  db:\n    image: postgres:14\n',
    '/image/Dockerfile': 'FROM node:20\n',
    '/.github/workflows/build.yml': 'on: push\njobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n',
    '/env/.env.example': 'STRIPE_SECRET_KEY=x\n',
  };
  const paths: Record<string, string[]> = { '/': [] };
  for (const file of Object.keys(files)) {
    const parts = file.slice(1).split('/');
    let folder = '/';
    for (const [i, part] of parts.entries()) {
      const entry = i === parts.length - 1 ? part : `${part}/`;
      if (!paths[folder].includes(entry)) paths[folder].push(entry);
      folder = path.posix.join(folder, part);
      paths[folder] ??= [];
    }
  }
  const graph = (await analyser({ provider: new FakeProvider({ paths, files }) })).toJson();
  expect(withoutEvidence(graph)).toEqual([]);

  const found = allEvidence(graph);
  const file = (tech: string, value: string, at: string) => ({ tech, kind: 'file', value, path: at, source: 'stack-analyser' });
  const expected = [
    file('elixir', 'mix.exs', '/elixir/mix.exs'),
    { tech: 'exunit', kind: 'source', value: 'ExUnit.start', path: '/elixir/test_helper.exs', line: 3, source: 'stack-analyser' },
    file('swift', 'Package.swift', '/swift/Package.swift'),
    { tech: 'swiftui', kind: 'source', value: 'SwiftUI', path: '/swift/View.swift', line: 2, source: 'stack-analyser' },
    file('maven', 'pom.xml', '/maven/pom.xml'),
    file('gradle', 'build.gradle', '/gradle/build.gradle'),
    file('maestro', 'smoke.yaml', '/mobile/.maestro/smoke.yaml'),
    file('nuget', 'Desktop.csproj', '/dotnet/Desktop.csproj'),
    file('winui', 'Desktop.csproj', '/dotnet/Desktop.csproj'),
    file('phpcomposer', 'composer.json', '/php/composer.json'),
    file('dart', 'pubspec.yaml', '/dart/pubspec.yaml'),
    file('ruby', 'demo.gemspec', '/gemspec/demo.gemspec'),
    file('bundler', 'Gemfile', '/bundler/Gemfile'),
    file('bundler', 'Gemfile.lock', '/locked/Gemfile.lock'),
    file('ruby', 'Gemfile.lock', '/locked/Gemfile.lock'),
    file('cargo', 'Cargo.toml', '/rust/Cargo.toml'),
    file('shadcn', 'components.json', '/ui/components.json'),
    file('golang', 'main.go', '/go/cmd/server/main.go'),
    file('docker', 'docker-compose.yml', '/compose/docker-compose.yml'),
    file('docker', 'Dockerfile', '/image/Dockerfile'),
    file('github.actions', 'build.yml', '/.github/workflows/build.yml'),
    { tech: 'stripe', kind: 'env', value: 'STRIPE_', path: '/env/.env.example', source: 'stack-analyser' },
  ];
  for (const item of expected) expect(found).toContainEqual(item);
});
