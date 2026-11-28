import { sourceText, tokens } from '../manifestTokens.js';
import { packageComponent, projectPath } from '../packageManifest.js';

import type { ComponentMatcher } from '../../../types/rule.js';
import type { Token } from '../manifestTokens.js';

const gemName = /^[a-z\d][a-z\d_.-]*$/i;
const gemfiles = new Set(['Gemfile', 'gems.rb']);
const locks = new Map([
  ['Gemfile', 'Gemfile.lock'],
  ['gems.rb', 'gems.locked'],
]);

function* statements(source: string): Generator<Token[]> {
  let row: Token[] = [],
    nesting = 0;
  for (const token of tokens(source, 'ruby')) {
    const last = row.at(-1);
    const separator = token.kind === 'symbol' && token.value === ';';
    if (last && !nesting && (separator || (last.line < token.line && last.value !== ','))) {
      yield row;
      row = [];
    }
    if (separator) continue;
    if (token.kind === 'symbol') {
      if (token.value === '(' || token.value === '[') nesting++;
      if (token.value === ')' || token.value === ']') nesting = Math.max(0, nesting - 1);
    }
    row.push(token);
  }
  if (row.length > 0) yield row;
}

// Keep literal declarations in the Bundler DSL or on the actual Gem::Specification
// block parameter. Never load the Gemfile or execute a gemspec.
function declaredGems(source: string, gemspec: boolean): Map<string, string> {
  const found = new Map<string, string>();
  const scopes: { receiver?: string; disabled: boolean; condition?: boolean }[] = [];
  for (const row of statements(source)) {
    const words = row.map((token) => (token.kind === 'string' ? '' : token.value));
    const first = words[0];
    if (first === 'end' || first === '}') {
      scopes.pop();
      continue;
    }
    const current = scopes.at(-1);
    if (first === 'else' && current?.condition !== undefined) {
      const scope = current;
      scope.disabled = !!scopes.at(-2)?.disabled || scope.condition === true;
      continue;
    }
    const block = words.indexOf('do');
    const brace = words.indexOf('{');
    const opener = block === -1 ? (brace !== -1 && words[brace + 1] === '|' ? brace : -1) : block;
    const parent = scopes.at(-1);
    if (opener >= 0 || /^(?:module|class|def|if|unless|case|begin|until|while|for)$/.test(first)) {
      const parameter =
        words[opener + 1] === '|' && row[opener + 2]?.kind === 'word' && words[opener + 3] === '|'
          ? words[opener + 2]
          : undefined;
      const constructor = words.slice(0, opener).join('');
      const spec = gemspec && /^(?:\w+=)?Gem::Specification\.new(?:\(\))?$/.test(constructor);
      const condition =
        ['if', 'unless'].includes(first) &&
        ['true', 'false'].includes(words[1]) &&
        words.length === 2
          ? (words[1] === 'true') === (first === 'if')
          : undefined;
      const receiver = spec
        ? parameter
        : parameter === parent?.receiver
          ? undefined
          : parent?.receiver;
      scopes.push({
        receiver,
        disabled: !!parent?.disabled || first === 'def' || condition === false,
        condition,
      });
      continue;
    }
    if (parent?.disabled) continue;
    let arg = 1;
    if (gemspec) {
      if (
        words[1] !== '.' ||
        !/^add_(?:(?:development|runtime)_)?dependency$/.test(words[2]) ||
        parent?.receiver !== first
      )
        continue;
      arg = 3;
    } else if (first !== 'gem') continue;
    if (words[arg] === '(') arg++;
    // The gem name may be missing when the statement ends early.
    const name = row.at(arg);
    if (name?.kind !== 'string' || !gemName.test(name.value)) continue;
    const tail = words.slice(arg + 1);
    if (tail.length > 0 && ![',', ')', 'if', 'unless'].includes(tail[0])) continue;
    if (
      (tail.at(-2) === 'if' && tail.at(-1) === 'false') ||
      (tail.at(-2) === 'unless' && tail.at(-1) === 'true')
    )
      continue;
    // A path or git override can reuse the name of an unrelated public gem.
    if (
      tail.some(
        (word, i) =>
          ['path', 'git', 'github'].includes(word) &&
          (tail[i + 1] === ':' || (tail[i - 1] === ':' && tail[i + 1] === '='))
      )
    )
      continue;
    const versions: string[] = [];
    for (let i = arg + 1; words[i] === ',' && row[i + 1]?.kind === 'string'; i += 2) {
      versions.push(row[i + 1].value);
    }
    found.set(name.value, versions.join(', ') || 'latest');
  }
  return found;
}

function lockedDirectGems(source: string): Map<string, string> {
  const direct = new Map<string, string>(),
    versions = new Map<string, string>();
  let section = '';
  for (const row of source.split(/\r?\n/)) {
    if (/^\S/.test(row)) {
      section = row;
      continue;
    }
    if (section === 'GEM') {
      const spec = /^ {4}([\w.-]+) \(([^()]+)\)$/.exec(row);
      if (spec) versions.set(spec[1], spec[2]);
    } else if (section === 'DEPENDENCIES') {
      // Only direct registry entries. Bang-suffixed entries use PATH/GIT sources.
      const dep = /^ {2}([\w.-]+)(?: \(([^()]+)\))?$/.exec(row);
      if (dep) direct.set(dep[1], dep[2] || 'latest');
    }
  }
  return new Map([...versions].filter(([name]) => direct.has(name)));
}

export const detectRubyLockfile: ComponentMatcher = async (files, provider) => {
  const available = files.filter((file) => file.type === 'file');
  const manifests = available.filter(
    (file) => gemfiles.has(file.name) || file.name.endsWith('.gemspec')
  );
  const components = [];
  for (const file of manifests) {
    const source = await sourceText(provider, file.fp);
    if (source === null) continue;
    const gemspec = !gemfiles.has(file.name);
    const packages = declaredGems(source, gemspec);
    const lock = gemspec
      ? undefined
      : available.find((entry) => entry.name === locks.get(file.name));
    if (lock) {
      const pinned = lockedDirectGems((await sourceText(provider, lock.fp)) || '');
      for (const [name, version] of packages) {
        const locked = pinned.get(name);
        if (version === 'latest' && locked !== undefined) packages.set(name, locked);
      }
    }
    const pl = packageComponent('virtual', {
      folderPath: file.fp,
      ecosystem: 'ruby',
      requirements: packages,
      file: file.fp,
    });
    const found = [{ kind: 'file' as const, value: file.name, path: file.fp }];
    if (gemspec)
      pl.addTech('ruby', {
        reason: ['gemspec: ' + projectPath(provider.basePath, file.fp)],
        evidence: found,
      });
    else pl.addTech('bundler', { reason: ['matched file: ' + file.name], evidence: found });
    components.push(pl);
  }
  // When a manifest exists it is authoritative. A stale lock cannot create a new
  // dependency, and transitive requirements under the specs section are never promoted.
  if (manifests.length === 0) {
    for (const file of available.filter((entry) => [...locks.values()].includes(entry.name))) {
      const packages = lockedDirectGems((await sourceText(provider, file.fp)) || '');
      if (packages.size === 0) continue;
      const pl = packageComponent('virtual', {
        folderPath: file.fp,
        ecosystem: 'ruby',
        requirements: packages,
        file: file.fp,
      });
      const found = [{ kind: 'file' as const, value: file.name, path: file.fp }];
      pl.addTech('bundler', { reason: ['matched file: ' + file.name], evidence: found });
      pl.addTech('ruby', {
        reason: ['Bundler lock: ' + projectPath(provider.basePath, file.fp)],
        evidence: found,
      });
      components.push(pl);
    }
  }
  return components.length > 0 ? components : false;
};
