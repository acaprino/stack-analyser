import { register } from '../../register.js';

register({
  tech: 'flutter',
  name: 'Flutter',
  type: 'framework',
  dependencies: [
    { type: 'githubAction', name: 'subosito/flutter-action' },
    { type: 'pub', name: 'flutter' },
  ],
});
