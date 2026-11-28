import { describe, expect, it, vi } from 'vitest';

import { matchAllFiles } from '../matchAllFiles.js';
import { matchDependencies } from '../matchDependencies.js';
import { Payload } from './index.js';
import '../autoload.js';

let id = 0;
vi.mock('../common/nid.ts', () => {
  return { nid: () => `${id++}` };
});

describe('payload', () => {
  it('should detect nested dependencies', () => {
    const root = new Payload({ name: 'root', folderPath: '/' });
    root.addChild(new Payload({ name: 'PubSub', folderPath: '/', tech: 'gcp.pubsub' }));

    expect(root.toJson()).toMatchSnapshot();
  });

  it('should reuse correctly nested dependency', () => {
    const root = new Payload({ name: 'root', folderPath: '/' });
    root.addChild(new Payload({ name: 'GCP manual', folderPath: '', tech: 'gcp' }));
    root.addChild(new Payload({ name: 'PubSub', folderPath: '/', tech: 'gcp.pubsub' }));

    expect(root.childs[0].name).toBe('GCP manual');
    expect(root.childs[0].id).toBe('4');
    expect(root.childs[1].name).toBe('PubSub');
    expect(root.childs[1].id).toBe('5');
    expect(root.childs[1].inComponent!.id).toBe('4');
  });

  it('should dedup child and path', () => {
    const root = new Payload({ name: 'root', folderPath: '/' });
    root.addChild(new Payload({ name: 'GCP1', folderPath: 'foo', tech: 'gcp' }));
    root.addChild(new Payload({ name: 'GCP2', folderPath: 'foo', tech: 'gcp' }));
    root.addChild(new Payload({ name: 'GCP3', folderPath: 'bar.xml', tech: 'gcp' }));

    expect(root.childs).toHaveLength(1);
    expect(root.childs[0].path).toStrictEqual(new Set(['foo', 'bar.xml']));
    expect(root.toJson().childs[0].path).toStrictEqual(['foo', 'bar.xml']);
  });

  it('should dedup matched tech', () => {
    const root = new Payload({ name: 'root', folderPath: '/' });
    const res = matchAllFiles(
      [
        { name: 'index.ts', fp: 'index.ts', type: 'file' },
        { name: 'script.ts', fp: 'scripts.ts', type: 'file' },
      ],
      '/'
    );
    root.addTechs(res);

    expect(root.techs).toStrictEqual(new Set(['typescript']));
    expect(root.reason).toStrictEqual(new Set(['matched extension: .ts']));
  });

  it('should run the dependency rules once for the names it is given', () => {
    const test = vi.spyOn(RegExp.prototype, 'test');
    try {
      matchDependencies(['pg', 'left-pad'], 'npm');
      const once = test.mock.calls.length;

      test.mockClear();

      new Payload({ name: 'root', folderPath: '/' }).addDependencyTechs(['pg', 'left-pad'], {
        type: 'npm',
        file: '/package.json',
      });

      expect(once).toBeGreaterThan(0);
      expect(test.mock.calls.length).toBeLessThanOrEqual(once);
    } finally {
      test.mockRestore();
    }
  });

  it('should keep one mention per tech, host, path and line when payloads are combined', () => {
    const mention = (line: number) => ({
      tech: 'telegram' as const,
      host: 'api.telegram.org',
      path: 'c.ts',
      line,
    });
    const a = new Payload({ name: 'a', folderPath: '/' });
    const b = new Payload({ name: 'b', folderPath: '/' });
    a.mentions.push(mention(1));
    b.mentions.push(mention(1), mention(2));
    a.combine(b);
    a.combine(b);

    expect(a.mentions).toStrictEqual([mention(1), mention(2)]);
  });
});
