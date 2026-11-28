import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { matchAllFiles } from '../matchAllFiles.js';
import { matchDependencies } from '../matchDependencies.js';
import { registeredRules, registeredTech } from '../register.js';

import '../autoload.js';

import type { SupportedDeps } from '../types/rule.js';
import type { AllowedKeys } from '../types/techs.js';

type Difference = { id: AllowedKeys; sign: string; reason: string };
const report = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, '../../benchmarks/registry-port.json'), 'utf8')
) as {
  registry: string;
  new: AllowedKeys[];
  extended: Record<string, string[]>;
  renamed: Record<string, AllowedKeys>;
  differences: Difference[];
};

// A sign is `<type>:<name>` for a package, and `pattern:`, `env:`, `host:`, `file:` or `source:` for the rest.
const kinds = ['pattern', 'env', 'host', 'file', 'source'];
const parse = ({ sign }: Difference): [string, string] => {
  const colon = sign.indexOf(':');
  return [sign.slice(0, colon), sign.slice(colon + 1)];
};
const differences = (wanted: (kind: string) => boolean) =>
  report.differences.filter((d) => wanted(parse(d)[0]));

describe('the report of the registry port', () => {
  it('records the registry it was made from', () => {
    expect(report.registry).toMatch(/^[0-9a-f]{64}$/);
  });

  it('names only rules the fork has', () => {
    const named = [
      ...report.new,
      ...Object.keys(report.extended),
      ...Object.values(report.renamed),
      ...report.differences.map((d) => d.id),
    ];
    expect(named.filter((id) => !registeredTech.has(id as AllowedKeys))).toEqual([]);
  });

  it('keeps a registry id and a rule id apart', () => {
    for (const id of Object.keys(report.renamed))
      expect(registeredTech.has(id as AllowedKeys), id).toBe(false);
  });

  it('gives every difference a reason of its own', () => {
    const reasons = report.differences.map((d) => d.reason);
    for (const reason of reasons) expect(reason.length).toBeGreaterThan(40);
    expect(new Set(report.differences.map((d) => `${d.id} ${d.sign}`)).size).toBe(
      report.differences.length
    );
  });

  it.each(differences((kind) => !kinds.includes(kind)).map((d) => [d.id, d.sign, d] as const))(
    '%s does not take the package %s',
    (id, _sign, difference) => {
      const [type, name] = parse(difference);
      expect([...matchDependencies([name], type as SupportedDeps).keys()]).not.toContain(id);
    }
  );

  it.each(differences((kind) => kind === 'file').map((d) => [d.id, d.sign, d] as const))(
    '%s does not list the file %s in a rule',
    (id, _sign, difference) => {
      const name = parse(difference)[1];
      const found = matchAllFiles([{ fp: `/repo/${name}`, name, type: 'file' }], '/repo');
      expect([...found.keys()]).not.toContain(id);
    }
  );

  it.each(differences((kind) => kind === 'env').map((d) => [d.id, d.sign, d] as const))(
    '%s does not list the variable %s',
    (id, _sign, difference) => {
      const rule = registeredRules.find((r) => r.tech === id);
      expect(rule?.dotenv ?? []).not.toContain(parse(difference)[1]);
    }
  );
});
