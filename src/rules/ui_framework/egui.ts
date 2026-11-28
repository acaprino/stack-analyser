import { register } from '../../register.js';

register({
  tech: 'egui',
  name: 'egui',
  type: 'ui_framework',
  dependencies: [
    { type: 'rust', name: 'eframe' },
    { type: 'rust', name: 'egui' },
  ],
});
