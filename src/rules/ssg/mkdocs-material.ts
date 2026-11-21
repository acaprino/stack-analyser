import { register } from '../../register.js';

register({
  tech: 'mkdocs-material',
  name: 'Material for MkDocs',
  type: 'ssg',
  dependencies: [
    { type: 'python', name: 'mkdocs-material' },
  ],
});
