import { register } from '../../register.js';

register({
  tech: 'bootstrap',
  name: 'Bootstrap',
  type: 'ui',
  dependencies: [
    { type: 'npm', name: 'bootstrap' },
    { type: 'php', name: 'twbs/bootstrap' },
    { type: 'maven', name: 'org.webjars.npm:bootstrap' },
    { type: 'maven', name: 'org.webjars:bootstrap' },
  ],
});
