import { Router } from 'express';
import health from './health.routes.js';
import auth from './auth.routes.js';
import users from './users.routes.js';
import categories from './categories.routes.js';
import products from './products.routes.js';
import shops from './shops.routes.js';
import cart from './cart.routes.js';
import orders from './orders.routes.js';
import appointments from './appointments.routes.js';
import inventory from './inventory.routes.js';
import files from './files.routes.js';

const api = Router();

api.use('/health', health);
api.use('/auth', auth);
api.use('/users', users);
api.use('/categories', categories);
api.use('/products', products);
api.use('/shops', shops);
api.use('/cart', cart);
api.use('/orders', orders);
api.use('/appointments', appointments);
api.use('/inventory', inventory);
api.use('/files', files);

export default api;
