import { register } from '../../register.js';

// wails.json is the project file of Wails v2; v3 projects have none and declare the module and the runtime.
register({
  tech: 'wails',
  name: 'Wails',
  type: 'framework',
  files: ['wails.json'],
  dependencies: [
    { type: 'golang', name: 'github.com/wailsapp/wails' },
    { type: 'npm', name: '@wailsio/runtime' },
  ],
});
