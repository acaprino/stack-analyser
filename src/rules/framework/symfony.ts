import { register } from '../../register.js';

register({
  tech: 'symfony',
  name: 'Symfony',
  type: 'framework',
  dependencies: [
    { type: 'php', name: 'symfony/symfony' },
    { type: 'php', name: 'symfony/framework-bundle' },
  ],
});
