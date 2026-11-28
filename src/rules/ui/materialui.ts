import { register } from '../../register.js';

register({
  tech: 'materialui',
  name: 'Material UI',
  type: 'ui',
  dependencies: [
    // Material UI 4 and earlier.
    { type: 'npm', name: '@material-ui/core' },
    { type: 'npm', name: '@mui/material' },
    { type: 'npm', name: '@mui/types' },
  ],
});
