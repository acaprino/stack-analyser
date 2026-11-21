import { register } from '../../register.js';

register({
  tech: 'gcp',
  name: 'GCP',
  type: 'cloud',
  dotenv: ['GOOGLE_CLOUD_CREDENTIALS', 'GOOGLE_CLOUD_PROJECT'],
  dependencies: [
    { type: 'npm', name: /^@google-cloud\//, example: '@google-cloud/projectify' },
    { type: 'terraform', name: 'registry.terraform.io/hashicorp/google' },
    { type: 'php', name: 'google/cloud' },
    { type: 'githubAction', name: 'google-github-actions/auth' },
    { type: 'githubAction', name: 'google-github-actions/setup-gcloud' },
    { type: 'npm', name: '@pulumi/gcp' },
  ],
});
