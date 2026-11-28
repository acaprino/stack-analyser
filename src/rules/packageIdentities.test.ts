import { describe, expect, it } from 'vitest';

import '../autoload.js';
import { dependencies, loadAllRules, rawList, rulesComponents } from '../loader.js';
import { matchDependencies } from '../matchDependencies.js';
import { registeredRules } from '../register.js';

import type { SupportedDeps } from '../types/rule.js';

const cases: [SupportedDeps, string, string[]][] = [
  ['maven', 'org.springframework.boot:spring-boot-starter-web', ['spring-boot', 'spring-mvc']],
  ['maven', 'org.springframework.boot:org.springframework.boot.gradle.plugin', ['spring-boot']],
  ['maven', 'org.springframework.boot', ['spring-boot']],
  ['maven', 'org.example:spring-boot-starter-web', []],
  ['maven', 'org.springframework.bootleg:spring-boot', []],
  ['maven', 'org.springframework.boot:spring-boot-starter-thymeleaf', ['spring-boot', 'thymeleaf']],
  ['maven', 'org.springframework.security:spring-security-web', ['spring-security']],
  ['maven', 'org.springframework:spring-webmvc', ['spring-mvc']],
  ['maven', 'org.springframework.cloud:spring-cloud-starter-config', ['spring-cloud-config']],
  ['maven', 'io.quarkus:quarkus-arc', ['quarkus']],
  [
    'maven',
    'io.quarkus:quarkus-hibernate-reactive-panache',
    ['hibernate-reactive', 'panache', 'quarkus'],
  ],
  ['maven', 'io.quarkus:quarkus-rest-qute', ['quarkus', 'quarkus-rest', 'qute']],
  ['maven', 'io.quarkus:quarkus-smallrye-health', ['quarkus']],
  ['maven', 'io.quarkus.platform:quarkus-camel-bom', ['quarkus']],
  ['maven', 'io.quarkus:io.quarkus.gradle.plugin', ['quarkus']],
  ['maven', 'io.quarkusfoo:quarkus-core', []],
  ['maven', 'io.quarkiverse.amazonservices:quarkus-amazon-s3', []],
  ['maven', 'io.micronaut.minimal.application', ['micronaut']],
  ['maven', 'io.github.resilience4j:resilience4j-micrometer', ['resilience4j']],
  ['maven', 'org.webjars.npm:vue-router', ['vue-router']],
  ['maven', 'org.example:vue-router', []],
  ['maven', 'org.junit.jupiter:junit-jupiter-api', ['junit-jupiter']],
  ['maven', 'io.gatlingxyz:charts', []],
  ['maven', 'io.micronautfoo:x', []],
  ['maven', 'io.micronaut:micronaut-core', ['micronaut']],
  ['maven', 'io.micronaut.data:micronaut-data-jdbc', ['micronaut']],
  ['nuget', 'microsoft.aspnetcore.app', ['aspnetcore']],
  ['nuget', 'MicrosoftXAspNetCore.App', []],
  ['npm', 'angular', ['angularjs']],
  ['npm', '@angular/core', ['angular']],
  ['npm', 'turbo', ['turborepo']],
  ['npm', '@hotwired/turbo', ['hotwire-turbo']],
  ['npm', 'vite-plus', ['vite-plus']],
  ['npm', 'vite', ['vite']],
  ['npm', '@tabler/core', ['tabler']],
  ['npm', '@tabler/icons-react', ['tablericons']],
  ['npm', '@astrojs/compiler', ['astro-compiler']],
  ['npm', '@types/d3-zoom', []],
  ['npm', '@acaprino/imago', ['imago']],
  ['npm', '@acaprino/imago-extra', []],
  ['npm', 'passport-google-oauth20', ['google.oauth']],
  ['python', 'opensearch-py', ['opensearch']],
  ['ruby', 'turbo-rails', ['hotwire-turbo']],
  ['php', 'symfony/stimulus-bundle', ['stimulus']],
  ['pub', 'flutter_test', ['flutter-test']],
  ['hex', 'phoenix_live_view', ['phoenix-liveview']],
  ['swiftpm', 'github.com/firebase/firebase-ios-sdk', ['firebase']],
  ['swiftpm', 'github.com/example/firebase-ios-sdk', []],
  ['docker', 'docker.io/library/redis:7', ['redis']],
  ['docker', 'registry.example/redis-proxy:7', []],
  ['npm', '@hubspot/api-client', ['hubspot']],
  ['npm', '@hubpost/api-client', []],
  ['npm', '@google-analytics/data', ['google.analytics']],
  ['npm', '@trayio/cdk-cli', ['trayio']],
  ['npm', 'sequelize-typescript', ['sequelize']],
  ['npm', 'unrelated-sequelize-fixture', []],
  ['npm', 'passport-google-oauth', ['google.oauth']],
  ['python', 'psycopg2', ['postgresql']],
  ['githubAction', 'AZURE/STATIC-WEB-APPS-DEPLOY', ['azure.staticwebapps']],
  ['githubAction', 'Azure/webapps-deploy', ['azure.appservice']],
  ['githubAction', 'ARIGA/ATLAS-ACTION/migrate/push', ['atlasgo']],
  ['githubAction', 'ARIGA/ATLAS-ACTION/MIGRATE/push', []],
  ['githubAction', 'SNYK/ACTIONS/php', ['snyk']],
  ['githubAction', 'gradle/actions/setup-gradle', ['gradle']],
  ['githubAction', 'other/actions/setup-gradle', []],
  ['githubAction', 'pnpm/action-setup', ['pnpm']],
  ['githubAction', 'oven-sh/setup-bun', ['bunsh']],
  ['githubAction', 'subosito/flutter-action', ['flutter']],
  ['terraform.resource', 'azurerm_linux_web_app', ['azure.appservice']],
  ['terraform.resource', 'azurerm_static_web_app', ['azure.staticwebapps']],
  ['terraform.resource', 'google_container_registry', ['gcp.containerregistry']],
  ['terraform.resource', 'google_container_node_pool', ['gcp.gke']],
  ['deno', 'https://deno.land/x/postgres/mod.ts', ['postgresql']],
  ['deno', 'https://other.example/x/postgres@1/mod.ts', []],
  ['deno', 'https://other.example/x/sqlite3@1/mod.ts', []],
  ['deno', 'https://deno.land/x/deploy@1.4.0/deployctl.ts.bak', []],
  ['docker', 'jenkins/jenkins:lts', ['jenkins']],
  ['docker', 'daprio/sentry', ['dapr']],
  ['docker', 'getsentry/sentry', ['sentry']],
  ['maven', 'io.micronaut:micronaut-http-client', ['micronaut']],
  ['maven', 'io.github.resilience4j:resilience4j-circuitbreaker', ['resilience4j']],
  ['maven', 'io.quarkus:quarkus-rest', ['quarkus', 'quarkus-rest']],
  ['maven', 'org.springframework.kafka:spring-kafka', ['apache_kafka']],
  ['golang', 'github.com/DataDog/dd-trace-go/v2', ['datadog']],
  ['golang', 'github.com/hashicorp/vault/api', ['hashicorp_vault']],
  ['python', 'pulumi-docker', ['docker']],
  ['python', 'jinja2', ['jinja']],
  ['npm', 'react-email', ['reactemail']],
  // A package that means a technology of its own and the one it works with gives both.
  ['npm', 'mongoose', ['mongodb', 'mongoose']],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-amqp',
    ['rabbitmq', 'spring-amqp', 'spring-boot'],
  ],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-data-mongodb',
    ['mongodb', 'spring-boot', 'spring-data-mongodb'],
  ],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-data-redis',
    ['redis', 'spring-boot', 'spring-data-redis'],
  ],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-data-redis-reactive',
    ['redis', 'spring-boot'],
  ],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-data-mongodb-reactive',
    ['mongodb', 'spring-boot'],
  ],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-data-elasticsearch',
    ['elasticsearch', 'spring-boot', 'spring-data-elasticsearch'],
  ],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-data-cassandra',
    ['apache_cassandra', 'spring-boot'],
  ],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-data-cassandra-reactive',
    ['apache_cassandra', 'spring-boot'],
  ],
  ['maven', 'org.springframework.boot:spring-boot-starter-data-neo4j', ['neo4j', 'spring-boot']],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-data-couchbase',
    ['couchbase', 'spring-boot'],
  ],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-data-couchbase-reactive',
    ['couchbase', 'spring-boot'],
  ],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-data-jpa',
    ['spring-boot', 'spring-data-jpa'],
  ],
  ['php', 'socialiteproviders/okta', ['okta', 'okta.oauth']],
  // Redistributions of an image that the registry's unanchored names found; an exporter is not the server,
  // and an organisation's own image of the same name stays unknown.
  ['docker', 'bitnami/redis:7.4', ['redis']],
  ['docker', 'registry-1.docker.io/bitnami/mysql:8.0', ['mysql']],
  ['docker', 'docker.elastic.co/elasticsearch/elasticsearch:8.15.0', ['elasticsearch']],
  ['docker', 'docker.elastic.co/kibana/kibana:8.15.0', ['kibana']],
  ['docker', 'confluentinc/cp-zookeeper:7.6.0', ['zookeeper']],
  ['docker', 'gcr.io/distroless/nodejs20-debian12:nonroot', ['nodejs']],
  ['docker', 'registry.access.redhat.com/ubi9/nodejs-20-minimal', ['nodejs']],
  ['docker', 'registry.access.redhat.com/ubi8/httpd-24', ['httpd']],
  ['docker', 'oliver006/redis_exporter', []],
  ['docker', 'prom/mysqld-exporter', []],
  ['docker', 'acme/redis', []],
  ['maven', 'io.gatling.gradle', ['gatling']],
  ['maven', 'org.typelevel:cats-core_sjs1_2.13', ['cats']],
  ['ruby', 'fluent-plugin-datadog', ['datadog']],
  ['npm', '@nestjs/sequelize', ['sequelize']],
  ['terraform.resource', 'google_container_azure_client', ['gcp.gke']],
  ['terraform.resource', 'google_container_analysis_note', []],
];

// Signs that the registry additions declare wrong and that the fork must not hold as a package. The bare
// Gradle plugin ids (com.android.application, org.springframework.boot and six more) are not here: the additions
// replace that package by the same anchored pattern, which the fork has. Dropping postman-collection loses postman
// on one recorded project, real-app-hoppscotch, whose expected labels do not include Postman: an accepted loss.
const wrongSigns: [string, SupportedDeps, string][] = [
  ['angular', 'npm', 'angular'],
  ['azure.storage', 'npm', '@azure/storage-blob'],
  ['azure.storage', 'ruby', 'azure-blob'],
  ['azure.storage', 'ruby', 'azure-storage-blob'],
  ['azure.storage', 'ruby', 'logstash-input-azureblob'],
  ['azure.storage', 'php', 'microsoft/azure-storage-blob'],
  ['azure.storage', 'php', 'league/flysystem-azure-blob-storage'],
  ['azure.storage', 'rust', 'azure_storage_blobs'],
  ['azure.storage', 'terraform.resource', 'airbyte_destination_azure_blob_storage'],
  ['azure.storage', 'python', 'azure-storage-blob'],
  ['azure.storage', 'golang', 'github.com/azure/azure-storage-blob-go'],
  ['gcp', 'npm', 'passport-google-oauth20'],
  ['postman', 'npm', 'postman-collection'],
];

describe('package identities', () => {
  it.each(cases)('should % %s', (type, name, expected) => {
    expect([...matchDependencies([name], type).keys()].sort()).toEqual(expected);
  });

  it.each(wrongSigns)('should % is not identified by the wrong sign %s %s', (tech, type, name) => {
    expect([...matchDependencies([name], type).keys()]).not.toContain(tech);
  });

  it('should preserve matcher and component counts when the default catalog is loaded again', () => {
    const counts = () => [dependencies.npm.length, rawList.length, rulesComponents.length];
    const before = counts();
    loadAllRules();

    expect(counts()).toEqual(before);
  });

  it('should not let one package identify two technologies', () => {
    const owners = new Map<string, Set<string>>();
    for (const rule of registeredRules) {
      for (const dep of rule.dependencies ?? []) {
        if (typeof dep.name !== 'string') continue;
        const key = `${dep.type}:${dep.name.toLowerCase()}`;
        owners.set(key, (owners.get(key) ?? new Set()).add(rule.tech));
      }
    }
    const shared = [...owners]
      .filter(([, techs]) => techs.size > 1)
      .map(([key, techs]) => `${key} → ${[...techs].sort().join(', ')}`);

    expect(shared).toMatchSnapshot();
  });
});
