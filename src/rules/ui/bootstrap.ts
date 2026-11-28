import { register } from '../../register.js';

register({
  tech: 'bootstrap',
  name: 'Bootstrap',
  type: 'ui',
  dependencies: [
    { type: 'npm', name: 'bootstrap' },
    // "A fully customizable version of Bootstrap", included instead of Bootstrap's own files.
    { type: 'npm', name: 'bootstrap-material-design' },
    { type: 'php', name: 'twbs/bootstrap' },
    { type: 'maven', name: 'org.webjars.npm:bootstrap' },
    { type: 'maven', name: 'org.webjars:bootstrap' },
  ],
});
