import { describe, expect, it } from 'vitest';

import { analyser } from '../../../analyser/index.js';
import { FakeProvider } from '../../../provider/fake.js';
import { registeredRules } from '../../../register.js';
import '../../../autoload.js';

async function techsOf(files: Record<string, string>): Promise<string[]> {
  const result = await analyser({
    provider: new FakeProvider({
      paths: { '/': Object.keys(files) },
      files: Object.fromEntries(Object.entries(files).map(([name, text]) => [`/${name}`, text])),
    }),
  });
  return [...result.techs].sort();
}

describe('extensions that two languages share', () => {
  it('should read a C header as C only', async () => {
    expect(await techsOf({ 'util.h': '#pragma once\nint add(int a, int b);\n' })).toStrictEqual([
      'c',
    ]);
  });

  it('should read an Objective-C header as Objective-C too', async () => {
    const header = '#import <Foundation/Foundation.h>\n@interface A : NSObject\n@end\n';

    expect(await techsOf({ 'A.h': header })).toStrictEqual(['c', 'objectivec']);
  });

  it('should tell an Objective-C .m file from a MATLAB one by its content', async () => {
    const objc = '#import "A.h"\n@implementation A\n@end\n';
    const matlab = '% adds two numbers\nfunction c = add(a, b)\n  c = a + b;\nend\n';

    expect(await techsOf({ 'A.m': objc })).toStrictEqual(['objectivec']);
    expect(await techsOf({ 'add.m': matlab })).toStrictEqual(['matlab']);
    expect(await techsOf({ 'A.m': objc, 'add.m': matlab })).toStrictEqual(['matlab', 'objectivec']);
  });

  it('should name no language for a .m file that shows neither', async () => {
    expect(await techsOf({ 'notes.m': 'x = 1\n' })).toStrictEqual([]);
  });

  it('should give the file and the line as evidence', async () => {
    const result = await analyser({
      provider: new FakeProvider({
        paths: { '/': ['A.m'] },
        files: { '/A.m': '// header\n@implementation A\n@end\n' },
      }),
    });

    expect(result.toJson('').evidence).toStrictEqual([
      {
        tech: 'objectivec',
        kind: 'source',
        value: '@implementation',
        path: '/A.m',
        line: 2,
        source: 'stack-analyser',
      },
    ]);
  });

  it('should give every extension to one rule only', () => {
    const owners = new Map<string, string[]>();
    for (const rule of registeredRules) {
      for (const extension of rule.extensions ?? []) {
        owners.set(extension, [...(owners.get(extension) ?? []), rule.tech]);
      }
    }
    const shared = [...owners].filter(([, techs]) => techs.length > 1);

    // Two languages that really are written in the same file. Anything else needs its content read.
    expect(shared).toStrictEqual([['.tsx', ['jsx', 'typescript']]]);
  });
});
