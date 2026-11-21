import { register } from '../../register.js';

register({
  tech: 'spacy',
  name: 'spaCy',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'spacy' }],
});
