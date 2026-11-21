import { register } from '../../register.js';

register({
  tech: 'tauri',
  name: 'Tauri',
  type: 'framework',
  files: ['tauri.conf.js', 'Tauri.toml', 'tauri.conf.json', 'tauri.conf.json5'],
  dependencies: [
    { type: 'rust', name: 'tauri' },
    { type: 'npm', name: /^@tauri-apps\//, example: '@tauri-apps/api' },
    { type: 'rust', name: 'tauri-build' },
  ],
});
