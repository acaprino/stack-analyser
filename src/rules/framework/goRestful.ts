import { register } from '../../register.js';

register({
  tech: 'go-restful',
  name: 'go-restful',
  type: 'framework',
  dependencies: [{ type: 'golang', name: 'github.com/emicklei/go-restful' }],
});
