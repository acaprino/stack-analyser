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
  // Mongoose is a technology of its own and works only with MongoDB.
  'npm:mongoose': ['mongodb', 'mongoose'],
  // Sign-in with Okta runs against an Okta organisation.
  'php:socialiteproviders/okta': ['okta', 'okta.oauth'],
  // Every artifact of the group io.quarkus is also quarkus.
  'maven:io.quarkus:quarkus-apicurio-registry-avro': ['avro', 'quarkus'],
  'maven:io.quarkus:quarkus-hibernate-orm-panache': ['hibernate', 'panache', 'quarkus'],
  'maven:io.quarkus:quarkus-hibernate-orm-panache-kotlin': ['hibernate', 'panache', 'quarkus'],
  'maven:io.quarkus:quarkus-hibernate-reactive-panache': ['hibernate-reactive', 'panache', 'quarkus'],
  'maven:io.quarkus:quarkus-junit-mockito': ['mockito', 'quarkus'],
  'maven:io.quarkus:quarkus-messaging-kafka': ['quarkus', 'smallrye-reactive-messaging'],
  'maven:io.quarkus:quarkus-mongodb-panache': ['panache', 'quarkus'],
  'maven:io.quarkus:quarkus-rest': ['quarkus', 'quarkus-rest'],
  'maven:io.quarkus:quarkus-rest-jackson': ['quarkus', 'quarkus-rest'],
  'maven:io.quarkus:quarkus-rest-qute': ['quarkus', 'quarkus-rest', 'qute'],
  'maven:io.quarkus:quarkus-websockets-next': ['quarkus', 'quarkus-websockets-next'],
  // A starter that brings the driver of one server gives that server as well.
  'maven:org.springframework.boot:spring-boot-starter-amqp': ['rabbitmq', 'spring-amqp', 'spring-boot'],
  'maven:org.springframework.boot:spring-boot-starter-data-cassandra': ['apache_cassandra', 'spring-boot'],
  'maven:org.springframework.boot:spring-boot-starter-data-cassandra-reactive': ['apache_cassandra', 'spring-boot'],
  'maven:org.springframework.boot:spring-boot-starter-data-couchbase': ['couchbase', 'spring-boot'],
  'maven:org.springframework.boot:spring-boot-starter-data-couchbase-reactive': ['couchbase', 'spring-boot'],
  'maven:org.springframework.boot:spring-boot-starter-data-elasticsearch': ['elasticsearch', 'spring-boot', 'spring-data-elasticsearch'],
  'maven:org.springframework.boot:spring-boot-starter-data-jpa': ['spring-boot', 'spring-data-jpa'],
  'maven:org.springframework.boot:spring-boot-starter-data-mongodb': ['mongodb', 'spring-boot', 'spring-data-mongodb'],
  'maven:org.springframework.boot:spring-boot-starter-data-mongodb-reactive': ['mongodb', 'spring-boot'],
  'maven:org.springframework.boot:spring-boot-starter-data-neo4j': ['neo4j', 'spring-boot'],
  'maven:org.springframework.boot:spring-boot-starter-data-redis': ['redis', 'spring-boot', 'spring-data-redis'],
  'maven:org.springframework.boot:spring-boot-starter-data-redis-reactive': ['redis', 'spring-boot'],
  'maven:org.springframework.boot:spring-boot-starter-security': ['spring-boot', 'spring-security'],
  'maven:org.springframework.boot:spring-boot-starter-thymeleaf': ['spring-boot', 'thymeleaf'],
  'maven:org.springframework.boot:spring-boot-starter-web': ['spring-boot', 'spring-mvc'],
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

describe('dependency names', () => {
  it('should not begin or end with whitespace', () => {
    // A name with a space around it is compared as written and so can never match a real package.
    const padded: string[] = [];
    for (const rule of registeredRules) {
      for (const dep of rule.dependencies ?? []) {
        if (typeof dep.name === 'string' && dep.name !== dep.name.trim()) {
          padded.push(`${rule.tech} ${dep.type}:${JSON.stringify(dep.name)}`);
        }
      }
    }
    expect(padded).toEqual([]);
  });
});

// Shared parsers emit these IDs directly. Parent products can be inferred from a
// registered child. The remaining historical product names have no direct detector.
const sharedReaderIds = ['cargo', 'phpcomposer', 'exunit', 'mapkit', 'swiftui', 'uikit', 'winui'];
const parentIds = ['adobe', 'microsoft'];
const catalogueOnly = [
  'fabric', 'meilisearchcloud', 'railway.mongodb', 'railway.mysql', 'railway.postgres', 'railway.redis',
  'replit.postgres', 'typesensecloud', 'apple.maps', 'vialink',
];
const indirect = new Set([...sharedReaderIds, ...parentIds, ...catalogueOnly]);

describe('rule completeness', () => {
  for (const rule of registeredRules) {
    it(`${rule.tech} has working examples or an explicit indirect status`, () => {
      const direct = Boolean(rule.detect || rule.files || rule.extensions?.length || rule.dotenv?.length ||
        rule.hosts?.length || rule.dependencies?.length);
      expect(direct, rule.tech).toBe(!indirect.has(rule.tech));
      if (rule.files instanceof RegExp && 'example' in rule) {
        expect(rule.example).toMatch(rule.files);
      }
      for (const dep of rule.dependencies ?? []) {
        if ('example' in dep) expect(dep.example).toMatch(dep.name);
      }
    });
  }
});
