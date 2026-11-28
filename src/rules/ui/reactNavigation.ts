import { register } from '../../register.js';

register({
  tech: 'react-navigation',
  name: 'React Navigation',
  type: 'ui',
  dependencies: [
    { type: 'npm', name: '@react-navigation/bottom-tabs' },
    { type: 'npm', name: '@react-navigation/native' },
    { type: 'npm', name: '@react-navigation/native-stack' },
    { type: 'npm', name: '@react-navigation/stack' },
  ],
});
