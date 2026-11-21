import { register } from '../../register.js';

register({
  tech: 'react-native-elements',
  name: 'React Native Elements',
  type: 'ui',
  dependencies: [
    { type: 'npm', name: '@rneui/base' },
    { type: 'npm', name: 'react-native-elements' },
  ],
});
