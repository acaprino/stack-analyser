import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import '../../../autoload.js';
import { analyser } from '../../../analyser/index.js';
import { FSProvider } from '../../../provider/fs.js';
import { Payload } from '../../../payload/index.js';
import { gradleDependencies } from './gradle.js';
import { detectGradle } from './index.js';
import { mavenProject } from './maven.js';

it('recognizes Spring Boot in the Maven and Gradle modules that declare it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'specfy-jvm-'));
  try {
    const pom = (id: string, group: string) => `<project xmlns="http://maven.apache.org/POM/4.0.0">
      <artifactId>${id}</artifactId><properties><boot.version>3.4.0</boot.version></properties>
      <dependencies><dependency><groupId>${group}</groupId><artifactId>spring-boot-starter-web</artifactId>
      <version>\${boot.version}</version></dependency></dependencies></project>`;
    const files = {
      'api/pom.xml': pom('api', 'org.springframework.boot'),
      'other/pom.xml': pom('other', 'org.example'),
      'settings.gradle.kts': 'rootProject.name = "services"',
      'build.gradle.kts': 'plugins { alias(libs.plugins.boot) apply false }',
      'gradle/libs.versions.toml': '[versions]\nboot="3.4.0"\n[plugins]\nboot={id="org.springframework.boot", version.ref="boot"}',
      'worker/build.gradle.kts': 'plugins { alias(libs.plugins.boot) }',
      'web/build.gradle': "dependencies { implementation 'org.springframework.boot:spring-boot-starter-web:3.4.0' }",
    };
    for (const [file, content] of Object.entries(files)) {
      const full = path.join(root, file);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, content);
    }
    const result = await analyser({ provider: new FSProvider({ path: root }) });
    const components = result.childs.flatMap((pl) => [pl, ...pl.childs]);
    const spring = components.filter((pl) => pl.techs.has('spring-boot'));
    const paths = spring.flatMap((pl) => [...pl.path]).map((p) => path.relative(root, p).split(path.sep).join('/'));
    expect(paths.sort()).toEqual(['api/pom.xml', 'web/build.gradle', 'worker/build.gradle.kts']);
    expect(components.find((pl) => pl.name === 'other')?.techs.has('maven')).toBe(true);
    expect(spring.find((pl) => pl.name === 'worker')?.techs.has('gradle')).toBe(true);
    expect(spring.find((pl) => pl.name === 'api')?.dependencies).toContainEqual([
      'maven', 'org.springframework.boot:spring-boot-starter-web', '3.4.0',
    ]);
    expect(spring.find((pl) => pl.name === 'worker')?.dependencies).toContainEqual([
      'maven', 'org.springframework.boot:org.springframework.boot.gradle.plugin', '3.4.0',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('reads effective local declarations without promoting POM defaults, examples or profiles', () => {
  expect(mavenProject(`<project><artifactId>app</artifactId>
    <parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>3</version></parent>
    <dependencyManagement><dependencies><dependency><groupId>x</groupId><artifactId>managed</artifactId></dependency>
    </dependencies></dependencyManagement><build><pluginManagement><plugins><plugin><artifactId>unused</artifactId></plugin>
    </plugins></pluginManagement><plugins><plugin><groupId>io.test</groupId><artifactId>used-plugin</artifactId></plugin></plugins></build>
    <profiles><profile><dependencies><dependency><groupId>x</groupId><artifactId>conditional</artifactId></dependency>
    </dependencies></profile></profiles><!-- <dependencies>unused</dependencies> --></project>`)?.dependencies)
    .toEqual([['maven', 'org.springframework.boot:spring-boot-starter-parent', '3'], ['maven', 'io.test:used-plugin', '']]);
  expect(mavenProject('<project><artifactId>broken</artifactId>')).toBeNull();
});

it('reads literal Gradle dependencies and skips unapplied plugins and non-dependency strings', () => {
  expect(gradleDependencies(`plugins {
    id("org.example.actual") version "1"
    id("org.springframework.boot") version "3" apply false
    id("org.example.unused").version("2")
      .apply(false)
  }
  val docs = """dependencies { implementation("group:in-docs:1") }"""
  // implementation("group:comment:2")
  dependencies {
    implementation(
      "com.example:core:2"
    )
    constraints { implementation("group:constraint:3") }
    if (enabled)
      implementation("group:conditional:3")
    else
      implementation("group:alternative:4")
    println("group:printed:4")
    implementation("group:prefix" + suffix)
    testImplementation group: 'another.group', name: 'test', version: '1'
    /* api("group:comment:1") */
  }
  subprojects { dependencies { implementation("child:only:1") } }`, new Map())).toEqual([
    ['maven', 'org.example.actual:org.example.actual.gradle.plugin', '1'],
    ['maven', 'com.example:core', '2'],
    ['maven', 'another.group:test', '1'],
  ]);
});

it('does not read a linked catalog as the declaring project’s version catalog', async () => {
  const root = path.resolve('sample');
  const build = path.join(root, 'build.gradle');
  const dir = path.join(root, 'gradle');
  const opened: string[] = [];
  const result = await detectGradle([
    { name: 'build.gradle', type: 'file', fp: build },
    { name: 'gradle', type: 'dir', fp: dir },
  ], {
    basePath: root,
    listDir: async () => [{ name: 'libs.versions.toml', fp: path.join(dir, 'libs.versions.toml'),
      type: 'file', isSymbolicLink: true }],
    stat: async () => null,
    open: async (file) => {
      opened.push(file);
      return file === build ? 'dependencies { implementation(libs.web) }'
        : '[libraries]\nweb="org.springframework.boot:spring-boot-starter-web:3"';
    },
  });
  expect(opened).toEqual([build]);
  expect(result instanceof Payload && result.dependencies).toEqual([]);
});
