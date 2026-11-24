import { register } from '../../register.js';

register({
  tech: 'httpd',
  name: 'HTTPD',
  type: 'app',
  files: ['httpd.conf'],
  dependencies: [
    { type: 'docker', name: /^httpd(?:\/|$)/, example: 'httpd' },
    // Red Hat's Apache HTTP Server images.
    {
      type: 'docker',
      name: /^(?:registry\.access\.redhat\.com|registry\.redhat\.io)\/ubi\d+\/httpd-24$/,
      example: 'registry.access.redhat.com/ubi8/httpd-24',
    },
  ],
});
