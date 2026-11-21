import { register } from '../../register.js';

register({
  tech: 'gcp.gke',
  name: 'Google Kubernetes',
  type: 'hosting',
  dependencies: [
    {
      type: 'terraform.resource',
      name: /^google_container_(?:(?:attached_|aws_|azure_)?cluster|(?:aws_|azure_)?node_pool)(?:_|$)/,
      example: 'google_container_cluster',
    },
    { type: 'githubAction', name: 'google-github-actions/get-gke-credentials' },
  ],
});
