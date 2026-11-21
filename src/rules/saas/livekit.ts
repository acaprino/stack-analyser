import { register } from '../../register.js';

register({
  tech: 'livekit',
  name: 'LiveKit',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@livekit/react-native' },
    { type: 'npm', name: 'livekit-client' },
    { type: 'npm', name: 'livekit-server-sdk' },
    { type: 'python', name: 'livekit-api' },
    { type: 'golang', name: 'github.com/livekit/server-sdk-go/v2' },
  ],
});
