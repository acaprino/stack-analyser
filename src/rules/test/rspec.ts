import { register } from '../../register.js';

register({
  tech: 'rspec',
  name: 'RSpec',
  type: 'test',
  dependencies: [
    { type: 'ruby', name: 'rspec' },
    { type: 'ruby', name: 'rspec-core' },
    { type: 'ruby', name: 'rspec-rails' },
  ],
});
