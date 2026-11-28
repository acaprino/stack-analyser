import { register } from '../../register.js';

register({
  tech: 'nestjs',
  name: 'NestJS',
  type: 'framework',
  files: ['nest-cli.json'],
  dependencies: [
    { type: 'npm', name: '@nestjs/cli' },
    { type: 'npm', name: '@nestjs/common' },
    { type: 'npm', name: '@nestjs/core' },
  ],
});
