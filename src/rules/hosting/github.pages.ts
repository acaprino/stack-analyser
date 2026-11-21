import { register } from '../../register.js';

register({
  tech: 'github.pages',
  name: 'Github Pages',
  type: 'hosting',
  dependencies: [
    { type: 'githubAction', name: 'actions/upload-pages-artifact' },
    { type: 'githubAction', name: 'actions/deploy-pages' },
    { type: 'githubAction', name: 'actions/configure-pages' },
    { type: 'ruby', name: 'github-pages' },
    { type: 'githubAction', name: 'peaceiris/actions-gh-pages' },
    { type: 'githubAction', name: 'JamesIves/github-pages-deploy-action' },
  ],
});
