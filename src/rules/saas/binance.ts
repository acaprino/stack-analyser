import { register } from '../../register.js';

register({
  tech: 'binance',
  name: 'Binance',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@binance/connector' },
    { type: 'python', name: 'binance-connector' },
  ],
});
