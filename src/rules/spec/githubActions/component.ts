import { parse } from 'yaml';

import { l } from '../../../common/log.js';
import { imageReference } from '../../../common/packageIdentity.js';
import { matchDependencies } from '../../../matchDependencies.js';
import { Payload } from '../../../payload/index.js';
import { isRecord, projectPath } from '../packageManifest.js';

import type { ComponentMatcher } from '../../../types/rule.js';

const workflowFile = /^\.github\/workflows\/[^/]+\.ya?ml$/;

function addImage(pl: Payload, value: unknown): void {
  const image = isRecord(value) ? value.image : value;
  if (typeof image !== 'string' || !image.trim()) return;
  const { name, version } = imageReference(image);
  if (!name || /[\s$]/.test(name)) return;
  pl.dependencies.push(['docker', name, version]);
  pl.addTechs(matchDependencies([name], 'docker'));
}

function addAction(pl: Payload, uses: unknown): void {
  if (typeof uses !== 'string') return;
  if (uses.startsWith('docker://')) {
    addImage(pl, uses.slice('docker://'.length));
    return;
  }
  if (uses.startsWith('./') && !/[\s$]/.test(uses)) {
    pl.dependencies.push(['githubAction', uses, '']);
    return;
  }
  const action = /^([\w.-]+\/[\w.-]+(?:\/[\w./-]+)*)@([^\s$@]+)$/.exec(uses);
  if (!action) return;
  const [, name, version] = action;
  pl.dependencies.push(['githubAction', name, version]);
  pl.addTechs(matchDependencies([name], 'githubAction'));
}

export const detectGithubActionsComponent: ComponentMatcher = async (files, provider) => {
  const workflows: Payload[] = [];
  for (const file of files) {
    const relative = projectPath(provider.basePath, file.fp);
    if (file.type !== 'file' || !workflowFile.test(relative)) continue;
    const content = await provider.open(file.fp);
    if (!content) continue;
    let parsed: unknown;
    try {
      parsed = parse(content);
    } catch {
      l.warn('Failed to parse workflow', file.fp);
      continue;
    }
    if (!isRecord(parsed) || !Object.hasOwn(parsed, 'on') || !isRecord(parsed.jobs)) continue;
    const jobs = Object.values(parsed.jobs).filter(isRecord);
    if (!jobs.length) continue;
    const pl = new Payload({ name: 'virtual', folderPath: file.fp });
    pl.addTech('github.actions', [`GitHub Actions workflow: ${relative}`]);
    for (const job of jobs) {
      addAction(pl, job.uses);
      if (Array.isArray(job.steps)) {
        for (const step of job.steps) if (isRecord(step)) addAction(pl, step.uses);
      }
      addImage(pl, job.container);
      if (isRecord(job.services)) {
        for (const service of Object.values(job.services)) {
          if (isRecord(service)) addImage(pl, service.image);
        }
      }
    }
    workflows.push(pl);
  }
  return workflows.length ? workflows : false;
};
