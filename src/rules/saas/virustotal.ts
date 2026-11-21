import { register } from '../../register.js';

register({
  tech: 'virustotal',
  name: 'VirusTotal',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'vt-py' }],
});
