import { register } from '../../register.js';

register({
  tech: 'archunit',
  name: 'ArchUnit',
  type: 'test',
  dependencies: [
    { type: 'maven', name: /^com\.tngtech\.archunit:archunit(?:-[a-z0-9.-]+)?$/, example: 'com.tngtech.archunit:archunit-junit5-api' },
  ],
});
