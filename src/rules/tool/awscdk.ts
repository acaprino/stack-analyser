import { register } from '../../register.js';

register({
  tech: 'awscdk',
  name: 'AWS CDK',
  type: 'tool',
  dependencies: [
    { type: 'python', name: 'aws-cdk-lib' },
    { type: 'golang', name: 'github.com/aws/aws-cdk-go/awscdk/v2' },
    { type: 'npm', name: 'aws-cdk-lib' },
  ],
});
