// inventory-service
// Demo e-commerce inventory microservice. In-memory only, no database, no auth.
// Node v24+ has global fetch built in, so no axios/node-fetch dependency is used.

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4004;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'inventory-service' });
});

// In-memory inventory storage: productId -> { productId, sku, quantityAvailable, warehouse, lastRestockedAt }
const inventory = new Map([
  ['p1', { productId: 'p1', sku: 'SKU-P1-HEADPHN', quantityAvailable: 48, warehouse: 'US-EAST-1', lastRestockedAt: '2026-09-30T08:00:00.000Z' }],
  ['p2', { productId: 'p2', sku: 'SKU-P2-SMARTWCH', quantityAvailable: 2, warehouse: 'US-WEST-1', lastRestockedAt: '2026-09-15T08:00:00.000Z' }],
  ['p3', { productId: 'p3', sku: 'SKU-P3-POURCOFF', quantityAvailable: 120, warehouse: 'US-EAST-1', lastRestockedAt: '2026-09-28T08:00:00.000Z' }],
  ['p4', { productId: 'p4', sku: 'SKU-P4-THROWPLW', quantityAvailable: 75, warehouse: 'US-WEST-1', lastRestockedAt: '2026-09-20T08:00:00.000Z' }],
  ['p5', { productId: 'p5', sku: 'SKU-P5-DESKLAMP', quantityAvailable: 30, warehouse: 'US-EAST-1', lastRestockedAt: '2026-09-25T08:00:00.000Z' }],
]);

const router = express.Router();

// GET /api/inventory -> list all inventory records
router.get('/', (req, res) => {
  res.status(200).json(Array.from(inventory.values()));
});

// GET /api/inventory/:productId -> one inventory record
router.get('/:productId', (req, res) => {
  const record = inventory.get(req.params.productId);
  if (!record) {
    return res.status(404).json({ error: 'Inventory record not found' });
  }
  res.status(200).json(record);
});

// PUT /api/inventory/:productId -> upsert exact quantityAvailable
router.put('/:productId', (req, res) => {
  const { productId } = req.params;
  const { quantityAvailable } = req.body || {};

  if (typeof quantityAvailable !== 'number' || quantityAvailable < 0) {
    return res.status(400).json({ error: 'quantityAvailable must be a number >= 0' });
  }

  const existing = inventory.get(productId);
  const record = existing
    ? { ...existing, quantityAvailable, lastRestockedAt: new Date().toISOString() }
    : {
        productId,
        sku: `SKU-${productId.toUpperCase()}`,
        quantityAvailable,
        warehouse: 'US-EAST-1',
        lastRestockedAt: new Date().toISOString(),
      };
  inventory.set(productId, record);

  res.status(200).json(record);
});

// POST /api/inventory/:productId/reserve -> decrement quantityAvailable
router.post('/:productId/reserve', (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body || {};

  if (typeof quantity !== 'number' || quantity <= 0) {
    return res.status(400).json({ error: 'quantity must be a number > 0' });
  }

  const record = inventory.get(productId);
  if (!record) {
    return res.status(404).json({ error: 'Inventory record not found' });
  }

  if (quantity > record.quantityAvailable) {
    return res.status(400).json({ error: 'Insufficient stock' });
  }

  record.quantityAvailable -= quantity;
  res.status(200).json(record);
});

app.use('/api/inventory', router);

// Basic 404 handler for unknown routes.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Inventory service listening on http://localhost:${PORT}`);
});
