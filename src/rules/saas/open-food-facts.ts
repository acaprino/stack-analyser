import { register } from '../../register.js';

register({
  tech: 'open-food-facts',
  name: 'Open Food Facts',
  type: 'saas',
  dependencies: [
    { type: 'python', name: 'openfoodfacts' },
  ],
});
