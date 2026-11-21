import { register } from '../../register.js';

register({
  tech: 'instana',
  name: 'Instana',
  type: 'monitoring',
  dependencies: [
    { type: 'maven', name: 'com.instana:instana-java-sdk' },
    { type: 'php', name: 'instana/instana-php-sdk' },
    { type: 'python', name: 'instana' },
    { type: 'npm', name: '@instana/collector' },
    { type: 'docker', name: 'instana/agent' },
  ],
});
