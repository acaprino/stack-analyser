import { describe, expect, it } from 'vitest';

import '../autoload.js';
import { matchDependencies } from '../matchDependencies.js';

import type { SupportedDeps } from '../types/rule.js';

const cases: [SupportedDeps, string, string[]][] = [
  ['maven', 'org.springframework.boot:spring-boot-starter-web', ['spring-boot']],
  ['maven', 'org.springframework.boot:org.springframework.boot.gradle.plugin', ['spring-boot']],
  ['maven', 'org.springframework.boot', ['spring-boot']],
  ['maven', 'org.example:spring-boot-starter-web', []],
  ['maven', 'org.springframework.bootleg:spring-boot', []],
  ['maven', 'org.springframework.boot:spring-boot-starter-thymeleaf', ['spring-boot', 'thymeleaf']],
  ['maven', 'org.springframework.security:spring-security-web', ['spring-security']],
  ['maven', 'org.springframework:spring-webmvc', ['spring-mvc']],
  ['maven', 'org.springframework.cloud:spring-cloud-starter-config', ['spring-cloud-config']],
  ['maven', 'io.quarkus:quarkus-arc', ['quarkus']],
  ['maven', 'io.micronaut.minimal.application', ['micronaut']],
  ['maven', 'io.github.resilience4j:resilience4j-micrometer', ['resilience4j']],
  ['maven', 'org.webjars.npm:vue-router', ['vue-router']],
  ['maven', 'org.example:vue-router', []],
  ['maven', 'org.junit.jupiter:junit-jupiter-api', ['junit-jupiter']],
  ['maven', 'io.gatlingxyz:charts', []],
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
];

describe('package identities', () => {
  it.each(cases)('%s %s', (type, name, expected) => {
    expect([...matchDependencies([name], type).keys()].sort()).toEqual(expected);
  });
});
