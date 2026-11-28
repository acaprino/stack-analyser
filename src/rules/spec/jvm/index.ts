import path from 'node:path';

import { gradleCatalog, gradleDependencies, gradleTestFrameworks } from './gradle.js';
import { mavenProject } from './maven.js';
import { sbtDependencies } from './sbt.js';
import { Payload } from '../../../payload/index.js';
import { sourceText } from '../manifestTokens.js';
import { oncePerRun, projectPath } from '../packageManifest.js';

import type { TestFramework } from './gradle.js';
import type { BaseProvider, ProviderFile } from '../../../provider/base.js';
import type { Dependency } from '../../../types/index.js';
import type { ComponentMatcher } from '../../../types/rule.js';

// spring-boot-starter-test and the test starter of each Spring Boot 4 module, which depends on it.
const bootTestStarter =
  /^org\.springframework\.boot:spring-boot-starter-(?:[\w-]+-)?test(?:-classic)?$/;
// What says the Spring Boot version of a build: its parent, its plugin, its BOM, or Spring Boot itself.
const bootVersionSource =
  /^org\.springframework\.boot:(?:spring-boot-starter-parent|spring-boot-dependencies|org\.springframework\.boot\.gradle\.plugin|spring-boot)$/;

/**
 * The test starter of Spring Boot that brings JUnit Jupiter, when the build has one. spring-boot-starter-test held
 * JUnit 4 up to Spring Boot 2.1 and JUnit Jupiter from 2.2 ("Starter for testing Spring Boot applications with
 * libraries including JUnit Jupiter"): a version below 2.2 that the build states rules it out, an unknown one does not.
 */
function bootJupiterStarter(deps: Dependency[]): string | undefined {
  const starter = deps.find(([, key]) => bootTestStarter.test(key));
  if (!starter) return undefined;
  const stated = [starter, ...deps.filter(([, key]) => bootVersionSource.test(key))];
  const beforeJupiter = stated.some((dependency) => {
    const release = /^(\d+)\.(\d+)(?:\D|$)/.exec(dependency[2]);
    if (!release) return false;
    const [major, minor] = [Number(release[1]), Number(release[2])];
    return major < 2 || (major === 2 && minor < 2);
  });
  return beforeJupiter ? undefined : starter[1];
}

function component(
  tool: 'gradle' | 'maven' | 'sbt',
  { name, file, deps }: { name: string; file: string; deps: Dependency[] }
): Payload {
  const dependencies = [...new Map(deps.map((d) => [JSON.stringify(d), d])).values()];
  const pl = new Payload({ name, folderPath: file, dependencies });
  pl.addTech(tool, {
    reason: [`build manifest: ${path.basename(file)}`],
    evidence: [{ kind: 'file', value: path.basename(file), path: file }],
  });
  pl.addDependencyTechs(
    dependencies.map(([, key]) => key),
    { type: 'maven', file }
  );
  const starter = bootJupiterStarter(dependencies);
  if (starter) {
    pl.addTech('junit-jupiter', {
      reason: [`${starter} brings JUnit Jupiter from Spring Boot 2.2`],
      evidence: [{ kind: 'package', value: starter, path: file }],
    });
  }
  return pl;
}

export const detectMaven: ComponentMatcher = async (files, provider) => {
  const pom = files.find((f) => f.type === 'file' && f.name === 'pom.xml');
  if (!pom) return false;
  const source = await provider.open(pom.fp);
  const project = source === null ? null : mavenProject(source);
  return project
    ? component('maven', { name: project.name, file: pom.fp, deps: project.dependencies })
    : false;
};

/** The version catalog of the Gradle build that `folder` belongs to, or `null`. */
async function catalogFile(
  provider: BaseProvider,
  { folder, files }: { folder: string; files: ProviderFile[] }
): Promise<null | ReturnType<typeof gradleCatalog>> {
  const base = path.resolve(provider.basePath);
  let current = path.resolve(folder);
  let children = files;
  for (;;) {
    const relative = path.relative(base, current);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
      return null;
    if (
      !relative ||
      children.some((f) => ['settings.gradle', 'settings.gradle.kts'].includes(f.name))
    ) {
      const gradleDir = children.find((f) => f.type === 'dir' && f.name === 'gradle');
      if (!gradleDir) return null;
      const gradleFiles = await provider.listDir(gradleDir.fp);
      const catalog = gradleFiles.find((f) => f.type === 'file' && f.name === 'libs.versions.toml');
      if (!catalog) return null;
      // Every module of the build asks for the same catalog.
      return oncePerRun(provider, {
        key: `gradle:${catalog.fp}`,
        read: async () => {
          const text = await provider.open(catalog.fp);
          return gradleCatalog(text ?? '');
        },
      });
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
    children = await provider.listDir(current);
  }
}

/**
 * The test framework calls that the root build of the Gradle build that `folder` belongs to makes for its subprojects,
 * with that build file; nothing when `folder` is the root itself or has no root above it in the analysed copy.
 */
async function rootTestFrameworks(
  provider: BaseProvider,
  { folder, files }: { folder: string; files: ProviderFile[] }
): Promise<{ file: ProviderFile; calls: Map<TestFramework, number> } | null> {
  const base = path.resolve(provider.basePath);
  const settings = (list: ProviderFile[]): boolean =>
    list.some((f) => ['settings.gradle', 'settings.gradle.kts'].includes(f.name));
  if (settings(files)) return null;
  let current = path.resolve(folder);
  for (;;) {
    const parent = path.dirname(current);
    const relative = path.relative(base, parent);
    if (parent === current || relative === '..' || relative.startsWith(`..${path.sep}`))
      return null;
    if (path.isAbsolute(relative)) return null;
    current = parent;
    const children = await provider.listDir(current);
    if (!settings(children)) continue;
    const build = children.find(
      (f) => f.type === 'file' && ['build.gradle', 'build.gradle.kts'].includes(f.name)
    );
    if (!build) return null;
    // Every module of the build asks for the same root script.
    const calls = await oncePerRun(provider, {
      key: `gradle-tests:${build.fp}`,
      read: async () => gradleTestFrameworks((await provider.open(build.fp)) ?? '').shared,
    });
    return { file: build, calls };
  }
}

export const detectGradle: ComponentMatcher = async (files, provider) => {
  const build = files.find(
    (f) => f.type === 'file' && ['build.gradle', 'build.gradle.kts'].includes(f.name)
  );
  if (!build) return false;
  const source = await provider.open(build.fp);
  if (source === null) return false;
  const folder = path.dirname(build.fp);
  const catalog = source.includes('libs.') ? await catalogFile(provider, { folder, files }) : null;
  const deps = gradleDependencies(source, catalog ?? new Map<string, Dependency[]>());
  const pl = component('gradle', {
    name: path.basename(folder) || 'Gradle project',
    file: build.fp,
    deps,
  });
  // The test task's framework, chosen in this script or, for its subprojects, in the root script of the build.
  const { own } = gradleTestFrameworks(source);
  const root = await rootTestFrameworks(provider, { folder, files });
  const chosen = (method: TestFramework): { file: ProviderFile; line: number } | undefined => {
    const line = own.get(method);
    if (line !== undefined) return { file: build, line };
    const inherited = root?.calls.get(method);
    return root && inherited !== undefined ? { file: root.file, line: inherited } : undefined;
  };
  const testNG = chosen('useTestNG');
  if (testNG) {
    pl.addTech('testng', {
      reason: [
        `Gradle useTestNG() at ${projectPath(provider.basePath, testNG.file.fp)}:${testNG.line}`,
      ],
      evidence: [
        { kind: 'file', value: testNG.file.name, path: testNG.file.fp, line: testNG.line },
      ],
    });
  }
  // kotlin("test") resolves to the variant of the framework the test task uses: kotlin-test-junit5 for the
  // JUnit Platform, which brings JUnit Jupiter.
  const platform = chosen('useJUnitPlatform');
  if (platform && deps.some(([, name]) => name === 'org.jetbrains.kotlin:kotlin-test')) {
    pl.addTech('junit-jupiter', {
      reason: [
        `kotlin.test with Gradle useJUnitPlatform() at ${projectPath(provider.basePath, platform.file.fp)}:${platform.line}`,
      ],
      evidence: [
        { kind: 'file', value: platform.file.name, path: platform.file.fp, line: platform.line },
      ],
    });
  }
  return pl;
};

// `build.sbt` is the project; the other `.sbt` files of its folder and of `project/` (plugins) add their module IDs.
export const detectSbt: ComponentMatcher = async (files, provider) => {
  const builds = files.filter((f) => f.type === 'file' && f.name.endsWith('.sbt'));
  if (builds.length === 0) return false;
  const payloads: Payload[] = [];
  for (const file of builds) {
    const source = await sourceText(provider, file.fp);
    if (source === null) continue;
    const deps = sbtDependencies(source);
    if (file.name === 'build.sbt') {
      payloads.push(
        component('sbt', {
          name: path.basename(path.dirname(file.fp)) || 'sbt project',
          file: file.fp,
          deps,
        })
      );
    } else if (deps.length > 0) {
      const pl = new Payload({ name: 'virtual', folderPath: file.fp, dependencies: deps });
      pl.addDependencyTechs(
        deps.map(([, key]) => key),
        { type: 'maven', file: file.fp }
      );
      payloads.push(pl);
    }
  }
  return payloads.length > 0 ? payloads : false;
};
