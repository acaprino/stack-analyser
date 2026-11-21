import { register } from '../../register.js';

register({
  tech: 'hotwire-turbo',
  name: 'Turbo',
  type: 'ui',
  dependencies: [
    { type: 'npm', name: '@hotwired/turbo' },
    { type: 'npm', name: '@hotwired/turbo-rails' },
    { type: 'ruby', name: 'turbo-rails' },
  ],
});
