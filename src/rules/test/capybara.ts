import { register } from '../../register.js';

register({
  tech: 'capybara',
  name: 'Capybara',
  type: 'test',
  dependencies: [
    { type: 'ruby', name: 'capybara' },
  ],
});
