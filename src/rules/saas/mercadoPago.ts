import { register } from '../../register.js';

register({
  tech: 'mercado-pago',
  name: 'Mercado Pago',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'mercadopago' },
    { type: 'python', name: 'mercadopago' },
    { type: 'golang', name: 'github.com/mercadopago/sdk-go' },
  ],
});
