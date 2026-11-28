import { parse } from 'yaml';

import { l } from '../../../common/log.js';
import { imageReference, imageRepository } from '../../../common/packageIdentity.js';
import { Payload } from '../../../payload/index.js';
import { isRecord, projectPath } from '../packageManifest.js';

import type { ComponentMatcher } from '../../../types/rule.js';

const workflowFile = /^\.github\/workflows\/[^/]+\.ya?ml$/;

function addImage(pl: Payload, { value, file }: { value: unknown; file: string }): void {
  const image = isRecord(value) ? value.image : value;
  if (typeof image !== 'string' || !image.trim()) return;
  const { name, version } = imageReference(image);
  if (!name || /[\s$]/.test(name)) return;
  pl.dependencies.push(['docker', name, version]);
  pl.addDependencyTechs([imageRepository(image)], { type: 'docker', file });
}

function addAction(pl: Payload, { uses, file }: { uses: unknown; file: string }): void {
  if (typeof uses !== 'string') return;
  if (uses.startsWith('docker://')) {
    addImage(pl, { value: uses.slice('docker://'.length), file });
    return;
  }
  if (uses.startsWith('./') && !/[\s$]/.test(uses)) {
    pl.dependencies.push(['githubAction', uses, '']);
    return;
  }
  // One path segment per repetition: a class that also held `/` could split a path in 2^n ways.
  const action = /^([\w.-]+\/[\w.-]+(?:\/[\w.-]+)*)@([^\s$@]+)$/.exec(uses);
  if (!action) return;
  const [, name, version] = action;
  pl.dependencies.push(['githubAction', name, version]);
  pl.addDependencyTechs([name], { type: 'githubAction', file: file });
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
    const jobs = Object.values(parsed.jobs).filter((job) => isRecord(job));
    if (jobs.length === 0) continue;
    const pl = new Payload({ name: 'virtual', folderPath: file.fp });
    pl.addTech('github.actions', {
      reason: [`GitHub Actions workflow: ${relative}`],
      evidence: [{ kind: 'file', value: file.name, path: file.fp }],
    });
    for (const job of jobs) {
      addAction(pl, { uses: job.uses, file: file.fp });
      if (Array.isArray(job.steps)) {
        for (const step of job.steps)
          if (isRecord(step)) addAction(pl, { uses: step.uses, file: file.fp });
      }
      addImage(pl, { value: job.container, file: file.fp });
      if (isRecord(job.services)) {
        for (const service of Object.values(job.services)) {
          if (isRecord(service)) addImage(pl, { value: service.image, file: file.fp });
        }
      }
    }
    workflows.push(pl);
  }
  return workflows.length > 0 ? workflows : false;
};
