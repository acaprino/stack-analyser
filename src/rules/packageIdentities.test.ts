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
    ['hibernate', 'spring-boot', 'spring-data-jpa'],
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
  // A test starter or the JUnit Jupiter support of another project brings JUnit Jupiter, Mockito with Spring Boot's.
  ['maven', 'org.junit.jupiter:junit-jupiter-params', ['junit-jupiter']],
  ['maven', 'org.junit.platform:junit-platform-launcher', []],
  ['maven', 'org.junit:junit-bom', []],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-test',
    ['junit-jupiter', 'mockito', 'spring-boot'],
  ],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-webmvc-test',
    ['junit-jupiter', 'mockito', 'spring-boot'],
  ],
  [
    'maven',
    'org.springframework.boot:spring-boot-starter-test-classic',
    ['junit-jupiter', 'mockito', 'spring-boot'],
  ],
  ['maven', 'org.springframework.boot:spring-boot-test', ['spring-boot']],
  ['maven', 'io.quarkus:quarkus-junit', ['junit-jupiter', 'quarkus']],
  ['maven', 'io.quarkus:quarkus-junit5', ['junit-jupiter', 'quarkus']],
  ['maven', 'io.micronaut.test:micronaut-test-junit5', ['junit-jupiter', 'micronaut']],
  ['maven', 'org.jetbrains.kotlin:kotlin-test-junit5', ['junit-jupiter', 'kotlin-test']],
  ['maven', 'org.jetbrains.kotlin:kotlin-test-junit', ['junit', 'kotlin-test']],
  ['maven', 'org.testcontainers:testcontainers-junit-jupiter', ['junit-jupiter', 'testcontainers']],
  ['maven', 'com.tngtech.archunit:archunit-junit5-engine', ['archunit']],
  ['maven', 'io.quarkus:quarkus-hibernate-orm', ['hibernate', 'quarkus']],
  ['npm', 'bootstrap-material-design', ['bootstrap']],
  ['npm', 'ionicons', ['ionicons']],
  // Desktop and UI toolkits, by the package each one's documentation names.
  ['golang', 'github.com/wailsapp/wails/v2', ['wails']],
  ['golang', 'github.com/wailsapp/wails/v3/pkg/application', ['wails']],
  ['golang', 'github.com/wailsapp/wailsx', []],
  ['npm', '@wailsio/runtime', ['wails']],
  ['nuget', 'Microsoft.UI.Xaml', ['winui']],
  ['nuget', 'Microsoft.WindowsAppSDK.WinUI', ['winui']],
  // The Windows App SDK serves WPF and Windows Forms apps as well: only UseWinUI says WinUI.
  ['nuget', 'Microsoft.WindowsAppSDK', []],
  ['nuget', 'Microsoft.NETCore.UniversalWindowsPlatform', ['uwp']],
  ['nuget', 'Avalonia', ['avalonia']],
  ['nuget', 'avalonia.desktop', ['avalonia']],
  ['nuget', 'Avalonia.Xaml.Behaviors', []],
  ['nuget', 'Uno.Sdk', ['uno-platform']],
  ['nuget', 'Uno.WinUI', ['uno-platform']],
  ['maven', 'org.openjfx:javafx-controls', ['javafx']],
  ['maven', 'org.openjfx:javafx-maven-plugin', ['javafx']],
  ['maven', 'org.openjfx.javafxplugin:org.openjfx.javafxplugin.gradle.plugin', ['javafx']],
  ['maven', 'org.openjfxtras:javafx-controls', []],
  ['python', 'pyqt6', ['pyqt']],
  ['python', 'PyQt5', ['pyqt']],
  ['python', 'PyQt6-WebEngine', []],
  ['python', 'pyside6-essentials', ['pyside']],
  ['python', 'PySide2', ['pyside']],
  ['python', 'Kivy', ['kivy']],
  ['python', 'kivymd', []],
  ['python', 'flet', ['flet']],
  ['python', 'flet_desktop', ['flet']],
  ['pub', 'flet', ['flet']],
  // PyGObject binds every GObject library, GStreamer and GLib as well as GTK.
  ['python', 'PyGObject', []],
  ['rust', 'gtk4', ['gtk']],
  ['rust', 'gtk', ['gtk']],
  ['golang', 'github.com/gotk3/gotk3', ['gtk']],
  ['golang', 'github.com/diamondburned/gotk4/pkg', ['gtk']],
  ['maven', 'org.java-gi:gtk', ['gtk']],
  ['nuget', 'GtkSharp', ['gtk']],
  ['nuget', 'GirCore.Gtk-4.0', ['gtk']],
  ['ruby', 'gtk3', ['gtk']],
  // The frameworks of the ecosystem lists that the fork missed (benchmarks/README.md, "Ecosystem coverage").
  ['npm', 'connect', ['connect-node']],
  ['npm', 'reveal.js', ['revealjs']],
  ['npm', 'element-ui', ['element-ui']],
  ['npm', 'element-plus', ['element-plus']],
  ['npm', 'bulma', ['bulma']],
  ['npm', 'reactstrap', ['bootstrap', 'reactstrap']],
  ['npm', 'react-bootstrap', ['bootstrap', 'react-bootstrap']],
  ['npm', '@ng-bootstrap/ng-bootstrap', ['bootstrap', 'ng-bootstrap']],
  ['npm', 'bootstrap-sass', ['bootstrap']],
  ['npm', 'jquery-ui', ['jquery-ui']],
  ['ruby', 'jquery-ui-rails', ['jquery-ui']],
  ['npm', 'ink', ['ink']],
  ['npm', 'knockout', ['knockout']],
  ['nuget', 'KnockoutJS', ['knockout']],
  ['npm', '@nestjs/core', ['nestjs']],
  ['npm', '@nestjs/platform-express', []],
  ['npm', '@material-ui/core', ['materialui']],
  ['python', 'tornado', ['tornado']],
  ['python', 'Starlette', ['starlette']],
  ['python', 'dash', ['dash']],
  ['python', 'dash-core-components', []],
  ['python', 'bottle', ['bottle']],
  ['python', 'Twisted', ['twisted']],
  ['golang', 'github.com/zenazn/goji', ['goji']],
  ['golang', 'github.com/go-martini/martini', ['martini']],
  ['golang', 'github.com/kataras/iris/v12', ['iris']],
  ['golang', 'github.com/emicklei/go-restful/v3', ['go-restful']],
  ['golang', 'github.com/labstack/echo', ['echo']],
  ['golang', 'github.com/labstack/echo/v4', ['echo']],
  ['golang', 'github.com/labstack/echo-contrib', []],
  ['rust', 'rocket', ['rocket']],
  ['rust', 'warp', ['warp']],
  ['rust', 'bevy', ['bevy']],
  ['rust', 'egui', ['egui']],
  ['rust', 'eframe', ['egui']],
  ['rust', 'tui', ['tui-rs']],
  ['rust', 'ratatui', ['ratatui']],
  ['nuget', 'bootstrap', ['bootstrap']],
  ['nuget', 'angularjs', ['angularjs']],
  ['maven', 'org.springframework:spring-web', ['spring-framework']],
  ['maven', 'org.springframework:spring-webmvc', ['spring-mvc']],
  ['maven', 'io.netty:netty-all', ['netty']],
  ['maven', 'io.netty:netty', ['netty']],
  ['maven', 'com.example:netty-all', []],
  ['maven', 'com.sun.jersey:jersey-server', ['jersey']],
  ['maven', 'org.glassfish.jersey.core:jersey-server', ['jersey']],
  ['php', 'livewire/livewire', ['livewire']],
  ['php', 'silex/silex', ['silex']],
  ['php', 'zendframework/zendframework', ['zend-framework']],
  ['php', 'components/bootstrap', ['bootstrap']],
  ['ruby', 'compass', ['compass']],
  ['ruby', 'middleman', ['middleman']],
  ['ruby', 'bootstrap-sass', ['bootstrap']],
  ['ruby', 'twitter-bootstrap-rails', ['bootstrap']],
  ['ruby', 'stimulus-rails', ['stimulus']],
  ['pub', 'shelf', ['shelf']],
  ['pub', 'shelf_router', []],
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

/** How many npm matchers, rules and component detectors the catalog holds. */
function catalogCounts(): number[] {
  return [dependencies.npm.length, rawList.length, rulesComponents.length];
}

describe('package identities', () => {
  it.each(cases)('should identify the %s package %s', (...[type, name, expected]) => {
    expect([...matchDependencies([name], type).keys()].sort()).toStrictEqual(expected);
  });

  it.each(wrongSigns)('should not identify %s by the wrong sign %s %s', (...[tech, type, name]) => {
    expect([...matchDependencies([name], type).keys()]).not.toContain(tech);
  });

  it('should preserve matcher and component counts when the default catalog is loaded again', () => {
    const before = catalogCounts();
    loadAllRules();

    expect(catalogCounts()).toStrictEqual(before);
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
