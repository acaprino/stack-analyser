import path from 'node:path';

import { Payload } from '../../../payload/index.js';
import { sourceText } from '../manifestTokens.js';

import type { ComponentMatcher } from '../../../types/rule.js';
import type { AllowedKeys } from '../../../types/techs.js';

/**
 * `.m` is Objective-C or MATLAB and `.h` is C or Objective-C: the extension cannot say which, the content can.
 * Each language is named by a construct only it has, at the start of a line.
 */
const objectiveC =
  /^[ \t]*(#import\b|@(?:interface|implementation|protocol|import|class|property|end)\b)/m;
const matlab = /^[ \t]*(function\b|classdef\b|%)/m;

// shortcut: 20 files read per folder and extension, upgrade if a folder mixes both languages past its first 20 files.
const MAX_FILES_PER_FOLDER = 20;

/** The first construct of `pattern` in `content` and the line it is on. */
function firstMarker(content: string, pattern: RegExp): { value: string; line: number } | null {
  const match = pattern.exec(content);
  if (!match) return null;
  return { value: match[1], line: content.slice(0, match.index).split('\n').length };
}

export const detectSharedExtensions: ComponentMatcher = async (files, provider) => {
  const found = new Map<AllowedKeys, { value: string; line: number; file: string }>();
  const read = { '.m': 0, '.h': 0 };
  for (const file of files) {
    const extension = path.extname(file.name);
    if (file.type !== 'file' || (extension !== '.m' && extension !== '.h')) continue;
    // A header only adds Objective-C (C keeps `.h` by extension); a `.m` file can be either language.
    const wanted: AllowedKeys[] = extension === '.h' ? ['objectivec'] : ['objectivec', 'matlab'];
    if (wanted.every((tech) => found.has(tech)) || read[extension]++ >= MAX_FILES_PER_FOLDER)
      continue;
    const content = await sourceText(provider, file.fp);
    if (!content) continue;
    const objc = firstMarker(content, objectiveC);
    if (objc) {
      if (!found.has('objectivec')) found.set('objectivec', { ...objc, file: file.fp });
    } else if (extension === '.m' && !found.has('matlab')) {
      const marker = firstMarker(content, matlab);
      if (marker) found.set('matlab', { ...marker, file: file.fp });
    }
  }
  if (found.size === 0) return false;

  const pl = new Payload({ name: 'virtual', folderPath: path.dirname(files[0].fp) });
  for (const [tech, { value, line, file }] of found) {
    pl.addTech(tech, {
      reason: [`${value} in ${path.basename(file)}`],
      evidence: [{ kind: 'source', value, path: file, line }],
    });
  }
  return pl;
};
