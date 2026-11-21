import { register } from '../../register.js';

register({
  tech: 'sqlmodel',
  name: 'SQLModel',
  type: 'orm',
  dependencies: [
    { type: 'python', name: 'sqlmodel' },
  ],
});
