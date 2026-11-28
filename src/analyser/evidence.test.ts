import path from 'node:path';

import { expect, test } from 'vitest';

import { analyser } from './index.js';
import { FakeProvider } from '../provider/fake.js';
import { FSProvider } from '../provider/fs.js';
import '../autoload.js';

import type { AnalyserJson } from '../types/index.js';
import type { AllowedKeys } from '../types/techs.js';

const root = path.join(import.meta.dirname, '../../tests/__fixtures__');

/** Every technology of a component with no evidence behind it, as `component: tech`. */
function withoutEvidence(graph: AnalyserJson): string[] {
  const missing: string[] = [];
  const visit = (node: AnalyserJson): void => {
    for (const id of node.tech ? [node.tech, ...node.techs] : node.techs) {
      if (!node.evidence.some((item) => item.tech === id)) missing.push(`${node.name}: ${id}`);
    }
    for (const item of node.evidence) {
      expect(item.path.startsWith('/'), item.path).toBe(true);
      expect(item.path).not.toMatch(/\\|^\/[A-Za-z]:/);
    }
    for (const child of node.childs) visit(child);
  };
  visit(graph);
  return missing;
}

function allEvidence(graph: AnalyserJson): AnalyserJson['evidence'] {
  return [...graph.evidence, ...graph.childs.flatMap((child) => allEvidence(child))];
}

/** A file evidence item, as the analyser writes it for a manifest it reads itself. */
function fileEvidence(
  tech: string,
  { value, at }: { value: string; at: string }
): AnalyserJson['evidence'][number] {
  return { tech: tech as AllowedKeys, kind: 'file', value, path: at, source: 'stack-analyser' };
}

test('every technology carries evidence', async () => {
  const analysed = await analyser({ provider: new FSProvider({ path: root }) });
  const graph = analysed.toJson(root);

  expect(withoutEvidence(graph)).toStrictEqual([]);
});

test('records the file, extension, variable or source behind a hand-written reason', async () => {
  const files: Record<string, string> = {
    '/elixir/mix.exs':
      'defmodule Demo.MixProject do\n  def project, do: [app: :demo, deps: []]\nend\n',
    '/elixir/test_helper.exs': 'defmodule T do\nend\nExUnit.start()\n',
    '/swift/Package.swift': 'let package = Package(name: "Mobile", dependencies: [])\n',
    '/swift/View.swift': 'import Foundation\nimport SwiftUI\n',
    '/maven/pom.xml':
      '<project xmlns="http://maven.apache.org/POM/4.0.0"><artifactId>app</artifactId></project>',
    '/gradle/build.gradle': 'plugins { id "java" }\n',
    '/mobile/.maestro/smoke.yaml': 'appId: com.example\n---\n- launchApp\n',
    '/dotnet/Desktop.csproj':
      '<Project><PropertyGroup><UseWinUI>true</UseWinUI></PropertyGroup></Project>',
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
    '/.github/workflows/build.yml':
      'on: push\njobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n',
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
  const analysed = await analyser({ provider: new FakeProvider({ paths, files }) });
  const graph = analysed.toJson();

  expect(withoutEvidence(graph)).toStrictEqual([]);

  const found = allEvidence(graph);
  const expected = [
    fileEvidence('elixir', { value: 'mix.exs', at: '/elixir/mix.exs' }),
    {
      tech: 'exunit',
      kind: 'source',
      value: 'ExUnit.start',
      path: '/elixir/test_helper.exs',
      line: 3,
      source: 'stack-analyser',
    },
    fileEvidence('swift', { value: 'Package.swift', at: '/swift/Package.swift' }),
    {
      tech: 'swiftui',
      kind: 'source',
      value: 'SwiftUI',
      path: '/swift/View.swift',
      line: 2,
      source: 'stack-analyser',
    },
    fileEvidence('maven', { value: 'pom.xml', at: '/maven/pom.xml' }),
    fileEvidence('gradle', { value: 'build.gradle', at: '/gradle/build.gradle' }),
    fileEvidence('maestro', { value: 'smoke.yaml', at: '/mobile/.maestro/smoke.yaml' }),
    fileEvidence('nuget', { value: 'Desktop.csproj', at: '/dotnet/Desktop.csproj' }),
    fileEvidence('winui', { value: 'Desktop.csproj', at: '/dotnet/Desktop.csproj' }),
    fileEvidence('phpcomposer', { value: 'composer.json', at: '/php/composer.json' }),
    fileEvidence('dart', { value: 'pubspec.yaml', at: '/dart/pubspec.yaml' }),
    fileEvidence('ruby', { value: 'demo.gemspec', at: '/gemspec/demo.gemspec' }),
    fileEvidence('bundler', { value: 'Gemfile', at: '/bundler/Gemfile' }),
    fileEvidence('bundler', { value: 'Gemfile.lock', at: '/locked/Gemfile.lock' }),
    fileEvidence('ruby', { value: 'Gemfile.lock', at: '/locked/Gemfile.lock' }),
    fileEvidence('cargo', { value: 'Cargo.toml', at: '/rust/Cargo.toml' }),
    fileEvidence('shadcn', { value: 'components.json', at: '/ui/components.json' }),
    fileEvidence('golang', { value: 'main.go', at: '/go/cmd/server/main.go' }),
    fileEvidence('docker', { value: 'docker-compose.yml', at: '/compose/docker-compose.yml' }),
    fileEvidence('docker', { value: 'Dockerfile', at: '/image/Dockerfile' }),
    fileEvidence('github.actions', { value: 'build.yml', at: '/.github/workflows/build.yml' }),
    {
      tech: 'stripe',
      kind: 'env',
      value: 'STRIPE_',
      path: '/env/.env.example',
      source: 'stack-analyser',
    },
  ];
  for (const item of expected) expect(found).toContainEqual(item);
});
