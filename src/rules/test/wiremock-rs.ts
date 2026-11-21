import { register } from '../../register.js';

register({
  tech: 'wiremock-rs',
  name: 'wiremock',
  type: 'test',
  dependencies: [
    { type: 'rust', name: 'wiremock' },
  ],
});
