import { register } from '../../register.js';

register({
  tech: 'tmdb',
  name: 'TMDb',
  type: 'saas',
  dependencies: [
    { type: 'nuget', name: 'TMDbLib' },
  ],
});
