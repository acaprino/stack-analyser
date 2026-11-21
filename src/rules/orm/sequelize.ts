import { register } from '../../register.js';

register({
  tech: 'sequelize',
  name: 'Sequelize',
  type: 'orm',
  files: ['.sequelizerc'],
  dependencies: [
    { type: 'npm', name: 'sequelize' },
    { type: 'npm', name: 'sequelize-cli' },
    { type: 'npm', name: 'sequelize-typescript' },
    { type: 'npm', name: /^@sequelize\//, example: '@sequelize/core' },
  ],
});
