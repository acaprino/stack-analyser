import path from 'node:path';

import { Payload } from '../../../payload/index.js';
import { gradleCatalog, gradleDependencies } from './gradle.js';
import { mavenProject } from './maven.js';

import type { BaseProvider, ProviderFile } from '../../../provider/base.js';
import type { Dependency } from '../../../types/index.js';
import type { ComponentMatcher } from '../../../types/rule.js';

function component(tool: 'maven' | 'gradle', name: string, file: string, deps: Dependency[]): Payload {
  const dependencies = [...new Map(deps.map((d) => [JSON.stringify(d), d])).values()];
  const pl = new Payload({ name, folderPath: file, dependencies });
  pl.addTech(tool, [`build manifest: ${path.basename(file)}`]);
  pl.addDependencyTechs(dependencies.map(([, key]) => key), 'maven', file);
  return pl;
}

export const detectMaven: ComponentMatcher = async (files, provider) => {
  const pom = files.find((f) => f.type === 'file' && !f.isSymbolicLink && f.name === 'pom.xml');
  if (!pom) return false;
  const source = await provider.open(pom.fp);
  const project = source && mavenProject(source);
  return project ? component('maven', project.name, pom.fp, project.dependencies) : false;
};

async function catalogFile(provider: BaseProvider, folder: string, files: ProviderFile[]) {
  const base = path.resolve(provider.basePath);
  let current = path.resolve(folder);
  let children = files;
  while (true) {
    const relative = path.relative(base, current);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
    if (!relative || children.some((f) => ['settings.gradle', 'settings.gradle.kts'].includes(f.name))) {
      const gradleDir = children.find((f) => f.type === 'dir' && !f.isSymbolicLink && f.name === 'gradle');
      if (!gradleDir) return null;
      const catalog = (await provider.listDir(gradleDir.fp))
        .find((f) => f.type === 'file' && !f.isSymbolicLink && f.name === 'libs.versions.toml');
      return catalog ? provider.open(catalog.fp) : null;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
    children = await provider.listDir(current);
  }
}

export const detectGradle: ComponentMatcher = async (files, provider) => {
  const build = files.find((f) => f.type === 'file' && !f.isSymbolicLink && ['build.gradle', 'build.gradle.kts'].includes(f.name));
  if (!build) return false;
  const source = await provider.open(build.fp);
  if (source === null) return false;
  const folder = path.dirname(build.fp);
  const catalog = source.includes('libs.') ? await catalogFile(provider, folder, files) : null;
  const deps = gradleDependencies(source, catalog ? gradleCatalog(catalog) : new Map());
  return component('gradle', path.basename(folder) || 'Gradle project', build.fp, deps);
};
