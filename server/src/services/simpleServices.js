/**
 * Resources whose behaviour is plain owner-scoped CRUD. Each is still exported
 * as its own service object so routes/controllers stay one-per-resource and
 * domain rules can be layered on later without a rewrite.
 */
import { createCrudService } from './crudService.js';

export const inventoryService = createCrudService({
  model: 'inventoryItem',
  ownerField: 'jewellerId',
  allowedSort: ['sku', 'name', 'quantity', 'unitCost', 'createdAt'],
  searchFields: ['sku', 'name', 'material', 'category'],
  filterable: ['jewellerId', 'category', 'material'],
});
