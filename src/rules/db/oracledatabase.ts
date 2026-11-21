import { register } from '../../register.js';

register({
  tech: 'oracledatabase',
  name: 'Oracle Database',
  type: 'db',
  dependencies: [
    { type: 'python', name: 'oracledb' },
    { type: 'golang', name: 'github.com/dzwvip/gorm-oracle' },
  ],
});
