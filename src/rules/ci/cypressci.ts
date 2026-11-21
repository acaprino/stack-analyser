import { register } from '../../register.js';

register({
  tech: 'cypressci',
  name: 'Cypress',
  type: 'ci',
  files: /^cypress\.config\.(?:[cm]?[jt]s)$/,
  example: 'cypress.config.js',
  dependencies: [
    { type: 'npm', name: 'cypress' },
    { type: 'npm', name: 'gatsby-cypress' },
    { type: 'docker', name: /^cypress(?:\/|$)/, example: 'cypress' },
    { type: 'ruby', name: 'cypress-on-rails' },
    { type: 'githubAction', name: 'cypress-io/github-action' },
  ],
});
