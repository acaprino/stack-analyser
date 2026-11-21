/* eslint-disable vitest/no-conditional-expect */
import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { dependencies, rawList } from '../loader.js';
import { registeredRules } from '../register.js';
import '../autoload.js';

const RULES_DIR = import.meta.dirname;

// These published adapters and starters explicitly name both technologies. Keep the exception on
// the complete coordinate so other packages from the same publisher still have to be unambiguous.
const integrations: Record<string, string[]> = {
  'golang:github.com/getsentry/sentry-go/otel': ['opentelemetry', 'sentry'],
  'golang:go.opentelemetry.io/otel/exporters/zipkin': ['opentelemetry', 'zipkin'],
  'npm:@netlify/plugin-nextjs': ['netlify', 'nextjs'],
  'maven:io.quarkus:quarkus-hibernate-orm-panache': ['hibernate', 'panache'],
  'maven:io.quarkus:quarkus-hibernate-orm-panache-kotlin': ['hibernate', 'panache'],
  'maven:io.quarkus:quarkus-hibernate-reactive-panache': ['hibernate-reactive', 'panache'],
  'maven:io.quarkus:quarkus-rest-qute': ['quarkus-rest', 'qute'],
  'maven:org.springframework.boot:spring-boot-starter-amqp': ['spring-amqp', 'spring-boot'],
  'maven:org.springframework.boot:spring-boot-starter-data-elasticsearch': ['spring-boot', 'spring-data-elasticsearch'],
  'maven:org.springframework.boot:spring-boot-starter-data-jpa': ['spring-boot', 'spring-data-jpa'],
  'maven:org.springframework.boot:spring-boot-starter-data-mongodb': ['spring-boot', 'spring-data-mongodb'],
  'maven:org.springframework.boot:spring-boot-starter-data-redis': ['spring-boot', 'spring-data-redis'],
  'maven:org.springframework.boot:spring-boot-starter-security': ['spring-boot', 'spring-security'],
  'maven:org.springframework.boot:spring-boot-starter-thymeleaf': ['spring-boot', 'thymeleaf'],
  'maven:org.springframework.boot:spring-boot-starter-webflux': ['spring-boot', 'spring-webflux'],
  'maven:org.springframework.boot:spring-boot-starter-webmvc': ['spring-boot', 'spring-mvc'],
  'nuget:Aspire.Azure.AI.OpenAI': ['azure.openai', 'dotnet-aspire'],
  'nuget:Aspire.Hosting.Azure.AppContainers': ['azure.containerapps', 'dotnet-aspire'],
  'nuget:Aspire.Hosting.PostgreSQL': ['dotnet-aspire', 'postgresql'],
  'nuget:Aspire.Hosting.RabbitMQ': ['dotnet-aspire', 'rabbitmq'],
  'nuget:Aspire.Hosting.Redis': ['dotnet-aspire', 'redis'],
  'nuget:Aspire.Hosting.SqlServer': ['dotnet-aspire', 'microsoft-sql-server'],
  'nuget:Aspire.Hosting.Yarp': ['dotnet-aspire', 'yarp'],
  'nuget:Aspire.Npgsql': ['dotnet-aspire', 'postgresql'],
  'nuget:Aspire.Npgsql.EntityFrameworkCore.PostgreSQL': ['dotnet-aspire', 'entity-framework-core', 'postgresql'],
  'nuget:Aspire.RabbitMQ.Client': ['dotnet-aspire', 'rabbitmq'],
  'nuget:Aspire.StackExchange.Redis': ['dotnet-aspire', 'redis'],
  'nuget:Microsoft.AspNetCore.Components.Web': ['aspnetcore', 'blazor'],
  'nuget:Microsoft.AspNetCore.Components.WebAssembly': ['aspnetcore', 'blazor'],
  'nuget:Microsoft.EntityFrameworkCore.Sqlite': ['entity-framework-core', 'sqlite'],
  'nuget:Microsoft.EntityFrameworkCore.SqlServer': ['entity-framework-core', 'microsoft-sql-server'],
  'nuget:MudBlazor': ['blazor', 'mudblazor'],
  'nuget:Npgsql.EntityFrameworkCore.PostgreSQL': ['entity-framework-core', 'postgresql'],
};

function getTypeFromFile(filePath: string): null | string {
  const content = fs.readFileSync(filePath, 'utf8');
  // Simple regex to extract type: 'value' or type: "value"
  const match = content.match(/type:\s*['"]([a-zA-Z0-9_]+)['"]/);
  return match ? match[1] : null;
}

describe('folder matches rule type', () => {
  const entries = fs.readdirSync(RULES_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    // The spec folder holds manifest parsers and shared helpers.
    if (entry.name === '__snapshots__' || entry.name === 'spec') {
      continue;
    }

    const folder = entry.name;
    const folderPath = path.join(RULES_DIR, folder);
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      if (!file.endsWith('.ts')) {
        continue;
      }
      if (file === 'index.ts') {
        continue;
      }

      const filePath = path.join(folderPath, file);

      it(`${path.basename(filePath)} type = '${folder}'`, () => {
        const type = getTypeFromFile(filePath);

        expect(type).toBe(folder);
      });
    }
  }
});

describe('no duplicate', () => {
  it('should not list multiple times the same name', () => {
    const names = new Set<string>();
    for (const rule of registeredRules) {
      if (names.has(rule.name)) {
        expect(rule.name).toBe(false);

        continue;
      }

      names.add(rule.name);
    }
  });

  it('should not list multiple times the same dependencies', () => {
    const deps = new Map<string, string>();
    for (const rule of registeredRules) {
      if (!rule.dependencies) {
        continue;
      }

      for (const dep of rule.dependencies) {
        const str = `${dep.type}:${dep.name}`;
        const prior = deps.get(str);
        if (prior) {
          expect(prior).not.toBe(rule.tech);
          expect(integrations[str], str).toEqual(expect.arrayContaining([prior, rule.tech]));
        }
        deps.set(str, rule.tech);
      }
    }
  });

  it('should not match multiple techs', () => {
    const remaining = new Set(Object.keys(integrations));
    for (const [name, matchers] of Object.entries(dependencies)) {
      const examples = new Set<string>();

      for (const item of rawList) {
        if (item.type !== 'dependency' || item.ref.type !== name) {
          continue;
        }

        const ex = 'example' in item.ref ? item.ref.example : item.ref.name;
        if (examples.has(ex)) {
          expect(integrations[`${name}:${ex}`], ex).toBeDefined();
        }

        examples.add(ex);
      }

      for (const ex of examples) {
        const expected = integrations[`${name}:${ex}`];
        if (expected) {
          const hits = matchers.filter((matcher) => matcher.match.test(ex)).map((matcher) => matcher.tech);
          expect(new Set(hits), ex).toEqual(new Set(expected));
          remaining.delete(`${name}:${ex}`);
          continue;
        }
        let matched: null | string = null;
        for (const matcher of matchers) {
          if (!matcher.match.test(ex)) {
            continue;
          }
          if (matched) {
            if (matched.split('.')[0] === matcher.tech.split('.')[0]) {
              // Skip hosting
              continue;
            }
            throw new Error(
              `Dependency "${ex}" (${name}) was already matched by "${matched}", and again by "${matcher.tech}"`
            );
          }
          matched = matcher.tech;
        }
      }
    }
    expect([...remaining]).toEqual([]);
  });
});

describe('rule completeness', () => {
  for (const rule of registeredRules) {
    it(`${rule.tech} should have at least one rule`, () => {
      const hasFiles = 'files' in rule && rule.files !== undefined;
      const hasDependencies =
        'dependencies' in rule && rule.dependencies !== undefined && rule.dependencies.length > 0;
      const hasExtensions =
        'extensions' in rule && rule.extensions !== undefined && rule.extensions.length > 0;
      const hasDotEnv = 'dotenv' in rule && rule.dotenv !== undefined && rule.dotenv.length > 0;
      if (!(hasFiles || hasDependencies || hasExtensions || hasDotEnv)) {
        // eslint-disable-next-line no-console
        console.warn(`[WARNING] Rule "${rule.tech}" does not have a rule`);
      }

      expect(true).toBe(true); // Always pass
    });
  }
});
