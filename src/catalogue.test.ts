import { describe, expect, it } from 'vitest';

import { catalogue } from './catalogue.js';
import { catalogue as exported, rules } from './index.js';
import './autoload.js';

import type { Rule } from './types/rule.js';

const keyOrder = ['tech', 'name', 'type', 'hosts', 'dependencies', 'files', 'dotenv', 'extensions'];

/** A rule the registry does not hold, frozen all the way down, so that writing to it anywhere throws. */
function frozen(rule: object): Rule {
  for (const value of Object.values(rule)) {
    if (typeof value === 'object' && value !== null && !(value instanceof RegExp))
      Object.freeze(value);
  }
  return Object.freeze(rule) as Rule;
}

function entryOf(tech: string): Record<string, unknown> {
  const entry = catalogue(rules.list).find((item) => item.tech === tech);

  expect(entry, tech).toBeDefined();

  return entry as unknown as Record<string, unknown>;
}

describe('catalogue', () => {
  it('should list every registered rule once, sorted by tech in code unit order', () => {
    const before = [...rules.list];
    const entries = catalogue(rules.list);

    expect(exported).toBe(catalogue);
    expect(rules.list.length).toBeGreaterThan(1000);
    expect(entries).toHaveLength(rules.list.length);

    const techs = entries.map((entry) => entry.tech);

    expect(new Set(techs).size).toBe(techs.length);
    expect(techs).toStrictEqual(rules.list.map((rule) => rule.tech).sort());

    for (const rule of rules.list) {
      const entry = entries.find((item) => item.tech === rule.tech);

      expect(entry, rule.tech).toMatchObject({ name: rule.name, type: rule.type });
    }

    // The registry is left as it was: same rules, same order.
    expect(rules.list).toHaveLength(before.length);

    for (const [index, rule] of before.entries()) expect(rules.list[index]).toBe(rule);
  });

  it('should sort by code unit, not by locale', () => {
    const entries = catalogue([
      { tech: 'b', name: 'B', type: 'tool' },
      { tech: 'a', name: 'A', type: 'tool' },
      { tech: 'Z', name: 'Z', type: 'tool' },
    ] as unknown as Rule[]);

    // A locale order puts "a" and "b" before "Z".
    expect(entries.map((entry) => entry.tech)).toStrictEqual(['Z', 'a', 'b']);
  });

  it('should give each entry only the known keys, in order, and none that is empty', () => {
    const entries = catalogue(rules.list);

    expect(entries).toHaveLength(rules.list.length);

    for (const entry of entries) {
      const keys = Object.keys(entry);

      expect(keys, entry.tech).toStrictEqual(keyOrder.filter((key) => keys.includes(key)));
      expect(keys.slice(0, 3)).toStrictEqual(['tech', 'name', 'type']);

      for (const value of Object.values(entry).filter((field) => Array.isArray(field))) {
        expect(value.length, entry.tech).toBeGreaterThan(0);
      }
    }
  });

  it('should write a pattern as its source, and it round-trips through JSON', () => {
    const entry = entryOf('spring-boot');
    const pattern = rules.list
      .find((rule) => rule.tech === 'spring-boot')!
      .dependencies!.map((dep) => dep.name)
      .find(
        (name): name is RegExp => name instanceof RegExp && name.source.includes('spring-boot(?:')
      )!;

    expect(entry.dependencies).toContainEqual({
      type: 'maven',
      pattern: String.raw`^org\.springframework\.boot:spring-boot(?:-[a-z0-9]+)*$`,
    });

    // Through JSON on purpose: the entry must survive being written and read back.
    const json = JSON.stringify(entry);
    const back = JSON.parse(json) as typeof entry;

    expect(back).toStrictEqual(entry);

    const written = (back.dependencies as { pattern?: string; flags?: string }[]).find((dep) =>
      dep.pattern?.includes('spring-boot(?:')
    )!;

    expect(new RegExp(written.pattern!, written.flags).source).toBe(pattern.source);
    // The example of a pattern is not written, and a string name has no pattern.
    expect(JSON.stringify(entry)).not.toContain('example');
    expect(entry.dependencies).toContainEqual({
      type: 'maven',
      name: 'org.springframework.boot:spring-boot-starter',
    });
  });

  it('should write the flags of a pattern only when it has some', () => {
    expect(entryOf('aspnetcore').dependencies).toStrictEqual([
      { type: 'nuget', pattern: String.raw`^Microsoft\.AspNetCore\.`, flags: 'i' },
    ]);

    const spring = entryOf('spring-boot').dependencies as object[];

    expect(spring.filter((dep) => 'pattern' in dep)).toHaveLength(2);
    expect(spring.some((dep) => 'flags' in dep)).toBe(false);
  });

  it('should write the files of a rule as a list or as the source of a pattern', () => {
    expect(entryOf('typescript').files).toStrictEqual({
      pattern: String.raw`^tsconfig(?:\.[\w-]+)*\.json$`,
    });

    const withList = rules.list.find((rule) => Array.isArray(rule.files) && rule.files.length > 0)!;

    expect(entryOf(withList.tech).files).toStrictEqual(withList.files);

    const withoutFiles = rules.list.find((rule) => rule.files === undefined)!;

    expect(entryOf(withoutFiles.tech)).not.toHaveProperty('files');
  });

  it('should list the Spring web starter for spring-mvc', () => {
    expect(entryOf('spring-mvc').dependencies).toContainEqual({
      type: 'maven',
      name: 'org.springframework.boot:spring-boot-starter-web',
    });
  });

  it('should give hosts to a rule that has them and none to a rule that has not', () => {
    expect(entryOf('openai')).toMatchObject({ hosts: ['api.openai.com'], dotenv: ['OPENAI_'] });
    expect(entryOf('typescript')).toMatchObject({ extensions: ['.ts', '.tsx', '.mts', '.cts'] });
    expect(entryOf('spring-mvc')).not.toHaveProperty('hosts');
    expect(entryOf('spring-mvc')).not.toHaveProperty('dotenv');
    expect(entryOf('spring-mvc')).not.toHaveProperty('extensions');

    const byTech = new Map(catalogue(rules.list).map((entry) => [entry.tech, entry]));
    for (const rule of rules.list) {
      expect('hosts' in byTech.get(rule.tech)!, rule.tech).toBe((rule.hosts?.length ?? 0) > 0);
    }
  });

  it('should leave out what a rule carries beyond the eight keys', () => {
    const leaves = ['example', 'matchFullPath', 'deploymentConfig', 'detect'];

    expect(rules.list.some((rule) => leaves.some((key) => key in rule))).toBe(true);

    const entries = catalogue(rules.list);

    expect(entries).toHaveLength(rules.list.length);

    for (const entry of entries) {
      for (const key of leaves) expect(entry, entry.tech).not.toHaveProperty(key);
    }
  });

  it('should not write what is empty, and mark a files that is not a list or a pattern as computed', () => {
    const [entry] = catalogue([
      frozen({
        tech: 'one',
        name: 'One',
        type: 'tool',
        hosts: [],
        dotenv: [],
        extensions: [],
        dependencies: [],
        files: [],
      }),
    ]);

    expect(entry).toStrictEqual({ tech: 'one', name: 'One', type: 'tool' });

    const [computed] = catalogue([
      frozen({ tech: 'two', name: 'Two', type: 'tool', files: () => [] }),
    ]);

    expect(computed).toStrictEqual({
      tech: 'two',
      name: 'Two',
      type: 'tool',
      files: { computed: true },
    });
  });

  it('should copy the lists, so that an entry can be changed without touching the rule', () => {
    const rule = {
      tech: 'one',
      name: 'One',
      type: 'tool',
      hosts: ['a.example'],
      files: ['one.cfg'],
      dotenv: ['ONE_'],
      extensions: ['.one'],
    } as unknown as Rule;
    const [entry] = catalogue([rule]);
    (entry.hosts as string[]).push('b.example');
    (entry.files as string[]).push('two.cfg');

    expect(rule.hosts).toStrictEqual(['a.example']);
    expect(rule.files).toStrictEqual(['one.cfg']);
  });
});
