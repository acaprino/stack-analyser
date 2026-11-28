import path from 'node:path';

import { gradleCatalog, gradleDependencies, gradleTestFrameworks } from './gradle.js';
import { mavenProject } from './maven.js';
import { sbtDependencies } from './sbt.js';
import { Payload } from '../../../payload/index.js';
import { sourceText } from '../manifestTokens.js';
import { oncePerRun, projectPath } from '../packageManifest.js';

import type { BaseProvider, ProviderFile } from '../../../provider/base.js';
import type { Dependency } from '../../../types/index.js';
import type { ComponentMatcher } from '../../../types/rule.js';

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
  const where = projectPath(provider.basePath, build.fp);
  const calls = gradleTestFrameworks(source);
  const testNG = calls.get('useTestNG');
  if (testNG !== undefined) {
    pl.addTech('testng', {
      reason: [`Gradle useTestNG() at ${where}:${testNG}`],
      evidence: [{ kind: 'file', value: build.name, path: build.fp, line: testNG }],
    });
  }
  // kotlin("test") resolves to the variant of the framework the test task uses: kotlin-test-junit5 for the
  // JUnit Platform, which brings JUnit Jupiter.
  const platform = calls.get('useJUnitPlatform');
  if (
    platform !== undefined &&
    deps.some(([, name]) => name === 'org.jetbrains.kotlin:kotlin-test')
  ) {
    pl.addTech('junit-jupiter', {
      reason: [`kotlin.test with Gradle useJUnitPlatform() at ${where}:${platform}`],
      evidence: [{ kind: 'file', value: build.name, path: build.fp, line: platform }],
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
