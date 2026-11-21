import { register } from '../../register.js';

register({
  tech: 'plotly',
  name: 'Plotly',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'plotly' }],
});
