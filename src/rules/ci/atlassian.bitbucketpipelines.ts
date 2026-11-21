import { register } from '../../register.js';

register({
  tech: 'atlassian.bitbucketpipelines',
  name: 'Bitbucket Pipelines',
  type: 'ci',
  files: ['bitbucket-pipelines.yml'],
  dependencies: [],
});
