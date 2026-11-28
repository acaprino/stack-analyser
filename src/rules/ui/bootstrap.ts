import { register } from '../../register.js';

register({
  tech: 'bootstrap',
  name: 'Bootstrap',
  type: 'ui',
  dependencies: [
    { type: 'npm', name: 'bootstrap' },
    { type: 'npm', name: 'bootstrap-sass' },
    // "A fully customizable version of Bootstrap", included instead of Bootstrap's own files.
    { type: 'npm', name: 'bootstrap-material-design' },
    // Bootstrap components for React and Angular, which need Bootstrap's CSS.
    { type: 'npm', name: '@ng-bootstrap/ng-bootstrap' },
    { type: 'npm', name: 'react-bootstrap' },
    { type: 'npm', name: 'reactstrap' },
    { type: 'nuget', name: 'bootstrap' },
    { type: 'php', name: 'components/bootstrap' },
    { type: 'php', name: 'twbs/bootstrap' },
    { type: 'maven', name: 'org.webjars.npm:bootstrap' },
    { type: 'maven', name: 'org.webjars:bootstrap' },
    { type: 'ruby', name: 'bootstrap' },
    { type: 'ruby', name: 'bootstrap-sass' },
    { type: 'ruby', name: 'twitter-bootstrap-rails' },
  ],
});
