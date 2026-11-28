import path from 'node:path';

import { parse as parseToml } from 'smol-toml';

import { l } from '../../../common/log.js';
import { Payload } from '../../../payload/index.js';
import { detectLicense } from '../licenses/index.js';
import { closing, tokens } from '../manifestTokens.js';
import { isRecord } from '../packageManifest.js';

import type { ProviderFile } from '../../../provider/base.js';
import type { Dependency } from '../../../types/index.js';
import type { ComponentMatcher } from '../../../types/rule.js';
import type { Token } from '../manifestTokens.js';

const PROJECT = 'pyproject.toml';
// pip fixes no name for a requirements file. These are the names Renovate's `pip_requirements` manager reads by default
// (`(^|/)[\w-]*requirements([-.]\w+)?\.(txt|pip)$`), plus every `.txt` of a `requirements` folder, as Dependabot reads
// them (`requirements/base.txt`): a file name, text without grammar.
const requirementsName = /^[\w-]*requirements(?:[-.]\w+)?\.(?:txt|pip)$/;
// A bare URL, directive or local path cannot establish a distribution name.
const requirement =
  /^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)(?:\[[\w., -]+\])?\s*(?=$|[<>=!~;@(])/;

/** PEP 503: names that differ only in case and in runs of `-`, `_` and `.` are one distribution. */
const normalized = (name: string): string => name.toLowerCase().replaceAll(/[-_.]+/g, '-');

/** A PEP 508 direct reference to a `file:` URL (`name @ file:///…`, as PDM writes a path) names a local distribution. */
function localReference(specifier: string): boolean {
  if (!specifier.startsWith('@')) return false;
  try {
    return new URL(specifier.slice(1).trim()).protocol === 'file:';
  } catch {
    return false;
  }
}

/**
 * The distributions that `[tool.uv.sources]` takes from the workspace (`workspace = true`) or from a local path
 * (`path = …`), by normalised name: they are not external packages. A git, url or index source is external. A list
 * of sources, one per marker, is local only when every source in it is.
 */
function uvLocalSources(tool: unknown): Set<string> {
  const local = new Set<string>();
  const sources = isRecord(tool) && isRecord(tool.uv) ? tool.uv.sources : undefined;
  if (!isRecord(sources)) return local;
  const isLocal = (source: unknown): boolean =>
    isRecord(source) && (source.workspace === true || typeof source.path === 'string');
  for (const [name, value] of Object.entries(sources)) {
    const entries: unknown[] = Array.isArray(value) ? value : [value];
    if (entries.length > 0 && entries.every(isLocal)) local.add(normalized(name));
  }
  return local;
}

export const detectPythonLockfile: ComponentMatcher = async (files, provider) => {
  const manifests: Payload[] = [];
  for (const file of files) {
    if (file.name === PROJECT) {
      const content = await provider.open(file.fp);
      if (!content) {
        continue;
      }

      const pl = new Payload({
        name: 'virtual',
        folderPath: path.dirname(file.fp),
      });
      const res = parsePyproject({ content, pl, file });
      if (!res) {
        continue;
      }

      manifests.push(pl);
    } else if (
      file.type === 'file' &&
      (requirementsName.test(file.name) ||
        (path.basename(path.dirname(file.fp)) === 'requirements' && file.name.endsWith('.txt')))
    ) {
      const content = await provider.open(file.fp);
      if (!content) {
        continue;
      }

      const pl = new Payload({
        name: 'virtual',
        folderPath: path.dirname(file.fp),
      });
      parseRequirementsTxt(content, pl, file.fp);

      manifests.push(pl);
    } else if (file.type === 'file' && ['Pipfile', 'setup.cfg', 'setup.py'].includes(file.name)) {
      const content = await provider.open(file.fp);
      if (!content) continue;
      const read =
        file.name === 'Pipfile'
          ? pipfile(content)
          : file.name === 'setup.cfg'
            ? setupCfg(content)
            : setupPy(content);
      if (read.length === 0) continue;
      const pl = new Payload({ name: 'virtual', folderPath: path.dirname(file.fp) });
      pl.dependencies = read;
      pl.addDependencyTechs(
        read.map(([, name]) => name),
        { type: 'python', file: file.fp }
      );
      manifests.push(pl);
    } else {
      continue;
    }
  }

  return manifests.length > 0 ? manifests : false;
};

function requirements(lines: unknown[]): Dependency[] {
  const dependencies: Dependency[] = [];
  for (const raw of lines) {
    if (typeof raw !== 'string') continue;
    const line = raw.trim().replace(/\s+#.*$/, '');
    const match = requirement.exec(line);
    if (!match) continue;
    const specifier = line.slice(match[0].length).split(';', 1)[0].trim();
    if (localReference(specifier)) continue;
    const version = /^\(?\s*[~!=<>]+\s*([^,\s)]+)/.exec(specifier)?.[1] || 'latest';
    dependencies.push(['python', match[1], version]);
  }
  return dependencies;
}

/** Pipenv's `[packages]` and `[dev-packages]`: a version string, or a table; a local `path` or `file` is not external. */
function pipfile(content: string): Dependency[] {
  let json: Record<string, unknown>;
  try {
    json = parseToml(content);
  } catch {
    return [];
  }
  const dependencies: Dependency[] = [];
  for (const table of [json.packages, json['dev-packages']]) {
    if (!isRecord(table)) continue;
    for (const [name, entry] of Object.entries(table)) {
      if (typeof entry === 'string')
        dependencies.push(['python', name, entry === '*' ? 'latest' : entry]);
      else if (isRecord(entry) && !('path' in entry) && !('file' in entry)) {
        dependencies.push([
          'python',
          name,
          typeof entry.version === 'string' && entry.version !== '*' ? entry.version : 'latest',
        ]);
      }
    }
  }
  return dependencies;
}

/**
 * setuptools' `[options] install_requires` and `[options.extras_require]` of `setup.cfg`, read as Python's configparser
 * reads them: `key = value` or `key: value`, the value going on over the indented lines that follow, `#` and `;` lines
 * are comments. No INI reader is a dependency of this package, and the two keys need nothing more.
 */
function setupCfg(content: string): Dependency[] {
  const lines: string[] = [];
  let section = '';
  let wanted = false;
  for (const raw of content.split(/\r?\n/)) {
    if (!raw.trim() || /^\s*[#;]/.test(raw)) continue;
    const header = /^\[([^\]]+)\]\s*$/.exec(raw);
    if (header) {
      section = header[1].trim();
      wanted = false;
      continue;
    }
    if (/^\s/.test(raw)) {
      if (wanted) lines.push(raw.trim());
      continue;
    }
    const entry = /^([^=:]+)[=:](.*)$/.exec(raw);
    const key = entry?.[1].trim().replaceAll('-', '_');
    wanted = Boolean(
      entry &&
        ((section === 'options' && key === 'install_requires') ||
          section === 'options.extras_require')
    );
    if (wanted && entry![2].trim()) lines.push(entry![2].trim());
  }
  return requirements(lines);
}

/** A list of string literals and commas from `start` (`[` or `(`); undefined when anything else is in it. */
function stringList(items: Token[], start: number): string[] | undefined {
  const stop = closing(items, start);
  if (stop < 0) return;
  const values: string[] = [];
  for (let i = start + 1; i < stop; i++) {
    if (items[i].kind === 'string') values.push(items[i].value);
    else if (items[i].value !== ',') return;
  }
  return values;
}

/**
 * The literal `install_requires=[...]` and `extras_require={"name": [...]}` keyword arguments of `setup.py`: the file is
 * Python and is never run; a computed value is not read.
 */
function setupPy(content: string): Dependency[] {
  const items = tokens(content, 'python');
  const lines: string[] = [];
  for (let i = 0; i + 3 < items.length; i++) {
    const { kind, value } = items[i];
    if (kind !== 'word' || items[i + 1].value !== '=' || items[i + 2].value === '=') continue;
    if (value === 'install_requires' && ['[', '('].includes(items[i + 2].value)) {
      lines.push(...(stringList(items, i + 2) ?? []));
    } else if (value === 'extras_require' && items[i + 2].value === '{') {
      const stop = closing(items, i + 2);
      for (let j = i + 3; j + 2 < stop; j++) {
        if (
          items[j].kind !== 'string' ||
          items[j + 1].value !== ':' ||
          !['[', '('].includes(items[j + 2].value)
        )
          continue;
        lines.push(...(stringList(items, j + 2) ?? []));
        j = closing(items, j + 2);
        if (j < 0) break;
      }
    }
  }
  return requirements(lines);
}

export function parseRequirementsTxt(content: string, pl: Payload, file: string): void {
  const lines = content
    .replaceAll(/\\\r?\n/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+--hash[=\s].*$/, ''));
  pl.dependencies = requirements(lines);
  pl.addDependencyTechs(
    pl.dependencies.map(([, name]) => name),
    { type: 'python', file: file }
  );
}

export function parsePyproject({
  content,
  pl,
  file,
}: {
  content: string;
  pl: Payload;
  file: ProviderFile;
}): boolean {
  let json: Record<string, unknown>;
  try {
    json = parseToml(content);
  } catch (err) {
    l.warn('Failed to parse pyproject.toml', file.fp, err);
    return false;
  }

  const prj = isRecord(json.project) ? json.project : {};
  const build = json['build-system'];
  const tool = isRecord(json.tool) ? json.tool : {};
  const groups: unknown[] = [prj.dependencies, isRecord(build) ? build.requires : undefined];
  // Hatch environments, PDM's development groups and uv's development list declare requirements as PEP 508 strings.
  const pdm = isRecord(tool.pdm) ? tool.pdm['dev-dependencies'] : undefined;
  for (const table of [prj['optional-dependencies'], json['dependency-groups'], pdm]) {
    if (isRecord(table)) groups.push(...Object.values(table));
  }
  const envs = isRecord(tool.hatch) ? tool.hatch.envs : undefined;
  if (isRecord(envs)) {
    for (const env of Object.values(envs)) {
      if (isRecord(env)) groups.push(env.dependencies, env['extra-dependencies']);
    }
  }
  if (isRecord(tool.uv)) groups.push(tool.uv['dev-dependencies']);
  const local = uvLocalSources(json.tool);
  const dependencies = requirements(groups.filter(Array.isArray).flat()).filter(
    ([, name]) => !local.has(normalized(name))
  );
  const poetry = isRecord(json.tool) ? json.tool.poetry : undefined;
  if (isRecord(poetry)) {
    const tables: unknown[] = [poetry.dependencies, poetry['dev-dependencies']];
    if (isRecord(poetry.group)) {
      for (const group of Object.values(poetry.group))
        if (isRecord(group)) tables.push(group.dependencies);
    }
    for (const table of tables) {
      if (!isRecord(table)) continue;
      for (const [name, constraint] of Object.entries(table)) {
        if (name.toLowerCase() === 'python') continue;
        for (const entry of Array.isArray(constraint) ? constraint : [constraint]) {
          if (typeof entry === 'string') dependencies.push(['python', name, entry]);
          else if (isRecord(entry) && !('path' in entry)) {
            dependencies.push([
              'python',
              name,
              typeof entry.version === 'string' ? entry.version : 'latest',
            ]);
          }
        }
      }
    }
  }
  if (!isRecord(json.project) && dependencies.length === 0) return false;
  if ('license' in prj) {
    const tmp = isRecord(prj.license) ? prj.license.text : prj.license;
    if (typeof tmp === 'string' && tmp) {
      const lic = detectLicense(tmp);
      if (lic !== false) {
        pl.addLicenses(lic);
      }
    }
  }

  pl.dependencies = [...new Map(dependencies.map((dep) => [JSON.stringify(dep), dep])).values()];
  pl.addDependencyTechs(
    pl.dependencies.map(([, name]) => name),
    { type: 'python', file: file.fp }
  );
  return true;
}
