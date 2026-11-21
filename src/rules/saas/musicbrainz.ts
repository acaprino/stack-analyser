import { register } from '../../register.js';

register({
  tech: 'musicbrainz',
  name: 'MusicBrainz',
  type: 'saas',
  dotenv: ['MUSICBRAINZ_USER_AGENT'],
});
