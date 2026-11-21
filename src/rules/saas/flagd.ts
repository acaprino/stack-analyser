import { register } from '../../register.js';

register({
  tech: 'flagd',
  name: 'flagd',
  type: 'saas',
  dependencies: [
    { type: 'golang', name: 'github.com/open-feature/go-sdk-contrib/providers/flagd' },
    { type: 'rust', name: 'open-feature-flagd' },
    { type: 'maven', name: 'dev.openfeature.contrib.providers:flagd' },
    { type: 'docker', name: 'ghcr.io/open-feature/flagd' },
  ],
});
