import { DockerfileParser } from 'dockerfile-ast';

import { imageReference } from '../../../common/packageIdentity.js';
import { matchDependencies } from '../../../matchDependencies.js';
import { Payload } from '../../../payload/index.js';

import type { ComponentMatcher } from '../../../types/rule.js';

const dockerfile = /^(?:(?:Dockerfile|Containerfile)(?:\.[\w.-]+)?|[\w.-]+\.(?:Dockerfile|Containerfile))$/i;

export const detectDockerfile: ComponentMatcher = async (files, provider) => {
  const group = new Payload({ name: 'virtual', folderPath: new Set<string>() });
  for (const file of files) {
    if (file.type !== 'file' || !dockerfile.test(file.name) || file.name.toLowerCase().endsWith('.dockerignore')) continue;
    const content = await provider.open(file.fp);
    if (!content) continue;
    const instructions = DockerfileParser.parse(content).getFROMs();
    if (!instructions.length) continue;

    const stages = new Set<string>();
    const images = new Set<string>();
    for (const from of instructions) {
      const reference = from.getImage();
      if (reference && !stages.has(reference.toLowerCase())) images.add(reference);
      const alias = from.getBuildStage();
      if (alias) stages.add(alias.toLowerCase());
    }

    const component = new Payload({ name: file.name, folderPath: file.fp });
    component.addTech('docker', [`FROM in ${file.name}`]);
    for (const reference of images) {
      const { name, version } = imageReference(reference);
      if (!name || name === 'scratch' || name.includes('$')) continue;
      component.dependencies.push(['docker', name, version]);
    }
    component.addTechs(matchDependencies(component.dependencies.map(([, name]) => name), 'docker'));
    group.addChild(component);
    group.path.add(file.fp);
  }
  return group.childs.length ? group : false;
};
