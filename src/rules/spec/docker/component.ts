import { parse } from 'yaml';

import { l } from '../../../common/log.js';
import { imageReference } from '../../../common/packageIdentity.js';
import { matchDependencies } from '../../../matchDependencies.js';
import { Payload } from '../../../payload/index.js';

import type { ComponentMatcher } from '../../../types/rule.js';
import type { AllowedKeys } from '../../../types/techs.js';

const FILES_REG = /^(?:docker-)?compose(?:[._-].+)?\.ya?ml$/;

interface DockerCompose {
  services: Record<string, DockerComposeService>;
}
interface DockerComposeService {
  image?: string;
  container_name?: string;
}

export const detectDockerComponent: ComponentMatcher = async (files, provider) => {
  const components: Payload[] = [];
  for (const file of files) {
    if (!FILES_REG.test(file.name)) {
      continue;
    }

    const content = await provider.open(file.fp);
    if (!content) {
      continue;
    }

    let parsed: DockerCompose;
    try {
      parsed = parse(content, {}) as DockerCompose;
      if (!parsed?.services || typeof parsed.services !== 'object' || Array.isArray(parsed.services)) {
        l.warn('Failed to parse Docker file', file.fp);
        continue;
      }
    } catch (err) {
      l.warn('Failed to parse', file.fp, err);
      continue;
    }

    const pl = new Payload({ name: 'virtual', folderPath: file.fp });

    for (const [name, service] of Object.entries<DockerComposeService>(parsed.services)) {
      if (typeof service?.image !== 'string' || !service.image) {
        continue;
      }

      // If we don't match, it's fine because docker is mostly made for services
      // It's better to have few false positive, than a lot of missing components
      const { name: imageName, version: imageVersion } = imageReference(service.image);
      if (imageName.includes('$')) {
        continue;
      }
      const matched = [...matchDependencies([imageName], 'docker').entries()];

      const tech = matched[0] as unknown as [AllowedKeys, string[]] | undefined;
      pl.addChild(
        new Payload({
          name: service.container_name || name,
          folderPath: file.fp,
          tech: tech ? tech[0] : null,
          parent: pl,
          dependencies: [['docker', imageName, imageVersion || 'latest']],
          reason: tech ? tech[1] : `matched: ${imageName}`,
        })
      );
    }

    components.push(pl);
  }

  return components.length > 0 ? components : false;
};
