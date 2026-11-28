import { register } from '../../register.js';

register({
  tech: 'javafx',
  name: 'JavaFX',
  type: 'ui_framework',
  dependencies: [
    { type: 'maven', name: /^org\.openjfx:/, example: 'org.openjfx:javafx-controls' },
    { type: 'maven', name: 'org.openjfx.javafxplugin:org.openjfx.javafxplugin.gradle.plugin' },
  ],
});
