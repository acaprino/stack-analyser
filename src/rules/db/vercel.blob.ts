import { register } from '../../register.js';

register({
  tech: 'vercel.blob',
  name: 'Vercel Blob',
  type: 'db',
  dependencies: [
    { type: 'npm', name: '@vercel/blob' },
    { type: 'rust', name: 'vercel-blob' },
  ],
});
