import { isMap, isScalar, isSeq, parseAllDocuments } from 'yaml';

import { Payload } from '../../../payload/index.js';
import { sourceText } from '../manifestTokens.js';
import { projectPath } from '../packageManifest.js';

import type { ComponentMatcher } from '../../../types/rule.js';

const flowPath = /(?:^|\/)(?:\.maestro\/|maestro\/(?:flows|subflows)\/).+\.ya?ml$/;
const commands = new Set([
  'launchApp',
  'tapOn',
  'runFlow',
  'assertVisible',
  'assertNotVisible',
  'scrollUntilVisible',
  'extendedWaitUntil',
  'takeScreenshot',
  'pressKey',
  'inputText',
]);

function isFlow(source: string): boolean {
  let docs: ReturnType<typeof parseAllDocuments>;
  try {
    docs = parseAllDocuments(source);
  } catch {
    // The parser recurses: a file nested deep enough overflows its stack. Such a file is not a flow.
    return false;
  }
  if (docs.length !== 2 || docs.some((doc) => doc.errors.length > 0)) return false;
  const [header, steps] = docs.map((doc) => doc.contents);
  if (!isMap(header) || !isSeq(steps)) return false;
  const appId: unknown = header.get('appId');
  if (typeof appId !== 'string' || !appId.trim()) return false;
  return steps.items.some((step) => {
    if (isScalar(step)) return step.value === 'launchApp';
    if (!isMap(step) || step.items.length !== 1) return false;
    const { key, value } = step.items[0];
    return (
      isScalar(key) &&
      typeof key.value === 'string' &&
      commands.has(key.value) &&
      value !== null &&
      (!isScalar(value) || value.value !== null)
    );
  });
}

export const detectMaestroFlow: ComponentMatcher = async (files, provider) => {
  for (const file of files) {
    if (file.type !== 'file' || file.isSymbolicLink) continue;
    const relative = projectPath(provider.basePath, file.fp);
    if (!flowPath.test(relative)) continue;
    const text = await sourceText(provider, file.fp);
    if (!text || !isFlow(text)) continue;
    const payload = new Payload({ name: 'virtual', folderPath: file.fp });
    payload.addTech('maestro', {
      reason: [relative],
      evidence: [{ kind: 'file', value: file.name, path: file.fp }],
    });
    return payload;
  }
  return false;
};
