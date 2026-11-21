import { register } from '../../register.js';

register({
  tech: 'razorpay',
  name: 'Razorpay',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'razorpay' },
    { type: 'python', name: 'razorpay' },
    { type: 'golang', name: 'github.com/razorpay/razorpay-go' },
  ],
});
