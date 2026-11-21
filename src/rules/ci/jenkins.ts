import { register } from '../../register.js';

register({
  tech: 'jenkins',
  name: 'Jenkins',
  type: 'ci',
  files: ['Jenkinsfile', '.jenkins/'],
  dependencies: [
    { type: 'docker', name: 'jenkins/jenkins' },
    { type: 'ruby', name: 'jenkins_api_client' },
  ],
});
