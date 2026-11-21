import { register } from '../../register.js';

register({
  tech: 'stimulus',
  name: 'Stimulus',
  type: 'framework',
  dependencies: [
    { type: 'php', name: 'symfony/stimulus-bundle' },
    { type: 'npm', name: '@hotwired/stimulus' },
  ],
});
