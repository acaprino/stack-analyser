import path from 'node:path';

import { l } from '../../../common/log.js';
import { detectLicense } from '../licenses/index.js';
import { isRecord, packageComponent } from '../packageManifest.js';

import type { ComponentMatcher } from '../../../types/rule.js';

export interface ComposerJson {
  name?: string;
  license?: string | string[];
  require?: Record<string, string>;
  'require-dev'?: Record<string, string>;
}

export const detectPhpComponent: ComponentMatcher = async (files, provider) => {
  const file = files.find((item) => item.name === 'composer.json' && item.type === 'file' && !item.isSymbolicLink);
  if (!file) return false;
  const content = await provider.open(file.fp);
  if (!content) return false;

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (err) {
    l.warn('Failed to parse composer.json', file.fp, err);
    return false;
  }
  if (!isRecord(json)) return false;
  const name = typeof json.name === 'string' && json.name.trim() ? json.name : undefined;
  const sections = [json.require, json['require-dev']].filter(isRecord);
  if (!name && !sections.length) return false;

  const requirements = new Map<string, string>();
  for (const section of sections) {
    for (const [id, version] of Object.entries(section)) {
      if (typeof version === 'string') requirements.set(id, version);
    }
  }
  const component = packageComponent(name ?? (path.basename(path.dirname(file.fp)) || 'virtual'), file.fp, 'php', requirements, file.fp);
  component.addTech('phpcomposer', ['matched file: composer.json']);
  const licenses = Array.isArray(json.license) ? json.license : [json.license];
  for (const license of licenses) {
    if (typeof license !== 'string') continue;
    const detected = detectLicense(license);
    if (detected) component.addLicenses(detected);
  }
  return component;
};
