import { register } from '../../register.js';

register({
  tech: 'okta',
  name: 'Okta',
  type: 'auth',
  dotenv: ['OKTA_'],
  dependencies: [
    { type: 'npm', name: /^@okta\//, example: '@okta/okta-signin-widget' },
    { type: 'terraform', name: 'registry.terraform.io/okta/okta' },
    { type: 'rust', name: 'okta' },
    { type: 'ruby', name: 'oktakit' },
    { type: 'npm', name: '@pulumi/okta' },
    { type: 'python', name: 'pulumi-okta' },
    // Sign-in with Okta (okta.oauth) runs against an Okta organisation.
    { type: 'php', name: 'socialiteproviders/okta' },
  ],
});
