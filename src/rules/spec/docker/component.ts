import { parse } from 'yaml';

import { l } from '../../../common/log.js';
import { imageReference, imageRepository } from '../../../common/packageIdentity.js';
import { matchDependencies } from '../../../matchDependencies.js';
import { Payload } from '../../../payload/index.js';
import { isRecord } from '../packageManifest.js';

import type { ComponentMatcher } from '../../../types/rule.js';

const FILES_REG = /^(?:docker-)?compose(?:[._-].+)?\.ya?ml$/;

export const detectDockerComponent: ComponentMatcher = async (files, provider) => {
  const components: Payload[] = [];
  for (const file of files) {
    if (file.type !== 'file' || !FILES_REG.test(file.name)) {
      continue;
    }

    const content = await provider.open(file.fp);
    if (!content) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = parse(content, { merge: true });
    } catch {
      l.warn('Failed to parse Compose file', file.fp);
      continue;
    }
    if (!isRecord(parsed)) continue;
    const declared: Record<string, unknown> = isRecord(parsed.services) ? parsed.services : {};
    const services = Object.entries(declared).filter(
      (entry): entry is [string, Record<string, unknown>] => {
        const [, service] = entry;
        return (
          isRecord(service) &&
          ['image', 'build', 'extends', 'provider'].some((key) => Object.hasOwn(service, key))
        );
      }
    );
    // A file that only includes other Compose files (the top-level `include` of Compose 2.20) is Compose as well.
    const includes = Array.isArray(parsed.include) && parsed.include.length > 0;
    if (services.length === 0 && !includes) continue;
    const pl = new Payload({ name: 'virtual', folderPath: file.fp });
    const reason =
      services.length > 0 ? `Compose services in ${file.name}` : `Compose include in ${file.name}`;
    pl.addTech('docker', [reason], [{ kind: 'file', value: file.name, path: file.fp }]);

    for (const [name, service] of services) {
      if (typeof service.image !== 'string' || !service.image.trim()) {
        continue;
      }

      const { name: imageName, version: imageVersion } = imageReference(service.image);
      if (!imageName || /[\s$]/.test(imageName)) {
        continue;
      }
      const matched = [...matchDependencies([imageName], 'docker').entries()];

      const tech = matched[0];
      pl.addChild(
        new Payload({
          name:
            typeof service.container_name === 'string' && service.container_name
              ? service.container_name
              : name,
          folderPath: file.fp,
          tech: tech ? tech[0] : null,
          parent: pl,
          dependencies: [['docker', imageName, imageVersion || 'latest']],
          reason: tech ? tech[1] : `matched: ${imageName}`,
          evidence: [{ kind: 'image', value: imageRepository(service.image), path: file.fp }],
        })
      );
    }

    components.push(pl);
  }

  return components.length > 0 ? components : false;
};
