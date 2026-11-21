import { register } from '../../register.js';

register({
  tech: 'typescript',
  name: 'Typescript',
  type: 'language',
  files: /^tsconfig(?:\.[\w-]+)*\.json$/,
  example: 'tsconfig.json',
  extensions: ['.ts', '.tsx', '.mts', '.cts'],
  dependencies: [{ type: 'npm', name: 'typescript' }],
});
