import { register } from '../../register.js';

register({
  tech: 'opencv',
  name: 'OpenCV',
  type: 'tool',
  dependencies: [
    { type: 'python', name: 'opencv-python' },
    { type: 'rust', name: 'opencv' },
    { type: 'golang', name: 'gocv.io/x/gocv' },
  ],
});
