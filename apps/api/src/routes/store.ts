// ──────────────────────────────────────────────
// TradeMind — Digital Products Store Routes
//
// Public:
//   GET  /store/products              → List active products
//   GET  /store/products/:id          → Product detail
//
// Authenticated:
//   POST /store/purchase/:productId   → Create Razorpay order
//   POST /store/verify-payment        → Verify + grant access
//   GET  /store/my-purchases          → User's purchased products
//   POST /store/access/:productId     → Track download, return URL
//   GET  /store/orders                → Order history
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import {
  getDatabase,
  products,
  productOrders,
  productAccess,
} from '@trademind/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { recordAdminAudit } from '../services/admin-audit.service';
import crypto from 'crypto';

export const storeRouter = new Hono();

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  productId: z.string().uuid(),
  orderId: z.string().uuid(),
});

// ── Public: List all active products ─────────
storeRouter.get('/products', async (c) => {
  const db = getDatabase();
  const typeFilter = c.req.query('type');

  const rows = await db
    .select({
      id: products.id,
      title: products.title,
      description: products.description,
      productType: products.productType,
      price: products.price,
      currency: products.currency,
      previewImageUrl: products.previewImageUrl,
      tags: products.tags,
      metadata: products.metadata,
      isFree: products.isFree,
      totalSales: products.totalSales,
      sortOrder: products.sortOrder,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(products.sortOrder, desc(products.createdAt));

  const filtered = typeFilter
    ? rows.filter((r) => r.productType === typeFilter)
    : rows;

  return c.json({ success: true, data: filtered });
});

// ── Public: Product detail ───────────────────
storeRouter.get('/products/:id', async (c) => {
  const db = getDatabase();
  const productId = c.req.param('id');
  if (!productId) {
    return c.json({ success: false, error: { message: 'Product ID is required' } }, 400);
  }

  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      description: products.description,
      longDescription: products.longDescription,
      productType: products.productType,
      price: products.price,
      currency: products.currency,
      previewImageUrl: products.previewImageUrl,
      videoUrl: products.videoUrl,
      tags: products.tags,
      metadata: products.metadata,
      isFree: products.isFree,
      totalSales: products.totalSales,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.isActive, true)))
    .limit(1);

  if (!product) {
    return c.json({ success: false, error: { message: 'Product not found' } }, 404);
  }

  return c.json({ success: true, data: product });
});

// ── Authenticated: Create purchase order ─────
storeRouter.post('/purchase/:productId', authMiddleware, async (c) => {
  const user = c.get('user');
  const productId = c.req.param('productId');
  if (!productId) {
    return c.json({ success: false, error: { message: 'Product ID is required' } }, 400);
  }

  const db = getDatabase();

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.isActive, true)))
    .limit(1);

  if (!product) {
    return c.json({ success: false, error: { message: 'Product not found' } }, 404);
  }

  // Check if already has access
  const [existingAccess] = await db
    .select({ id: productAccess.id })
    .from(productAccess)
    .where(and(eq(productAccess.userId, user.id), eq(productAccess.productId, productId)))
    .limit(1);

  if (existingAccess) {
    return c.json({
      success: false,
      error: { message: 'You already have access to this product.' },
    }, 409);
  }

  // Free product — grant access immediately
  if (product.isFree || product.price === 0) {
    const [order] = await db
      .insert(productOrders)
      .values({
        userId: user.id,
        productId,
        amountPaid: 0,
        currency: product.currency,
        provider: 'free',
        status: 'paid',
        paidAt: new Date(),
      })
      .returning();

    if (!order) throw new Error('Failed to create free order');

    await db.insert(productAccess).values({
      userId: user.id,
      productId,
      orderId: order.id,
      grantReason: 'free',
      accessGrantedAt: new Date(),
    });

    await db
      .update(products)
      .set({ totalSales: sql`${products.totalSales} + 1` })
      .where(eq(products.id, productId));

    await recordAdminAudit({
      actor: { id: user.id, email: user.email },
      action: 'PRODUCT_ACCESS_GRANTED_FREE',
      entityType: 'product',
      entityId: productId,
      metadata: { productTitle: product.title },
    });

    return c.json({ success: true, data: { isFree: true, hasAccess: true } });
  }

  // Paid product — create Razorpay order
  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return c.json({ success: false, error: { message: 'Payment gateway not configured.' } }, 503);
  }

  const orderPayload = {
    amount: product.price,
    currency: product.currency,
    receipt: `prod_${productId.slice(0, 8)}_${Date.now()}`,
    notes: { productId, userId: user.id },
  };

  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderPayload),
  });

  if (!rpRes.ok) {
    console.error('[Store] Razorpay order creation failed', await rpRes.text());
    return c.json({ success: false, error: { message: 'Failed to create payment order.' } }, 500);
  }

  const rpOrder = await rpRes.json() as { id: string };

  const [pendingOrder] = await db
    .insert(productOrders)
    .values({
      userId: user.id,
      productId,
      amountPaid: product.price,
      currency: product.currency,
      provider: 'razorpay',
      providerOrderId: rpOrder.id,
      status: 'pending',
    })
    .returning();

  if (!pendingOrder) throw new Error('Failed to persist pending order');

  return c.json({
    success: true,
    data: {
      orderId: pendingOrder.id,
      razorpayOrderId: rpOrder.id,
      razorpayKeyId: RAZORPAY_KEY_ID,
      amount: product.price,
      currency: product.currency,
      productTitle: product.title,
    },
  });
});

// ── Authenticated: Verify payment + grant access ─
storeRouter.post('/verify-payment', authMiddleware, validateBody(verifyPaymentSchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody');
  const db = getDatabase();

  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';
  const expectedSig = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${body.razorpayOrderId}|${body.razorpayPaymentId}`)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSig, 'hex'),
    Buffer.from(body.razorpaySignature, 'hex'),
  );

  if (!isValid) {
    return c.json({ success: false, error: { message: 'Payment signature verification failed.' } }, 400);
  }

  const [order] = await db
    .update(productOrders)
    .set({
      providerPaymentId: body.razorpayPaymentId,
      providerSignature: body.razorpaySignature,
      status: 'paid',
      paidAt: new Date(),
      rawProviderData: { orderId: body.razorpayOrderId, paymentId: body.razorpayPaymentId },
    })
    .where(
      and(
        eq(productOrders.id, body.orderId),
        eq(productOrders.userId, user.id),
        eq(productOrders.productId, body.productId),
      ),
    )
    .returning();

  if (!order) {
    return c.json({ success: false, error: { message: 'Order not found.' } }, 404);
  }

  await db
    .insert(productAccess)
    .values({
      userId: user.id,
      productId: body.productId,
      orderId: order.id,
      grantReason: 'purchased',
      accessGrantedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .update(products)
    .set({ totalSales: sql`${products.totalSales} + 1` })
    .where(eq(products.id, body.productId));

  await recordAdminAudit({
    actor: { id: user.id, email: user.email },
    action: 'PRODUCT_PURCHASED',
    entityType: 'product_order',
    entityId: order.id,
    metadata: { productId: body.productId, amount: order.amountPaid, provider: 'razorpay' },
  });

  return c.json({ success: true, data: { hasAccess: true, orderId: order.id } });
});

// ── Authenticated: My purchases ──────────────
storeRouter.get('/my-purchases', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const rows = await db
    .select({
      accessId: productAccess.id,
      grantReason: productAccess.grantReason,
      downloadCount: productAccess.downloadCount,
      lastAccessedAt: productAccess.lastAccessedAt,
      accessGrantedAt: productAccess.accessGrantedAt,
      productId: products.id,
      title: products.title,
      description: products.description,
      productType: products.productType,
      previewImageUrl: products.previewImageUrl,
      videoUrl: products.videoUrl,
      tags: products.tags,
      metadata: products.metadata,
      isFree: products.isFree,
    })
    .from(productAccess)
    .innerJoin(products, eq(productAccess.productId, products.id))
    .where(eq(productAccess.userId, user.id))
    .orderBy(desc(productAccess.accessGrantedAt));

  return c.json({ success: true, data: rows });
});

// ── Authenticated: Access / download product ─
storeRouter.post('/access/:productId', authMiddleware, async (c) => {
  const user = c.get('user');
  const productId = c.req.param('productId');
  if (!productId) {
    return c.json({ success: false, error: { message: 'Product ID is required' } }, 400);
  }

  const db = getDatabase();

  const [access] = await db
    .select()
    .from(productAccess)
    .where(and(eq(productAccess.userId, user.id), eq(productAccess.productId, productId)))
    .limit(1);

  if (!access) {
    return c.json({ success: false, error: { message: 'You do not have access to this product.' } }, 403);
  }

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);

  if (!product) {
    return c.json({ success: false, error: { message: 'Product not found.' } }, 404);
  }

  await db
    .update(productAccess)
    .set({
      downloadCount: sql`${productAccess.downloadCount} + 1`,
      lastAccessedAt: new Date(),
    })
    .where(eq(productAccess.id, access.id));

  return c.json({
    success: true,
    data: {
      downloadUrl: product.downloadUrl,
      videoUrl: product.videoUrl,
      title: product.title,
      productType: product.productType,
    },
  });
});

// ── Authenticated: Order history ─────────────
storeRouter.get('/orders', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const rows = await db
    .select({
      orderId: productOrders.id,
      status: productOrders.status,
      amountPaid: productOrders.amountPaid,
      currency: productOrders.currency,
      provider: productOrders.provider,
      paidAt: productOrders.paidAt,
      createdAt: productOrders.createdAt,
      productId: products.id,
      title: products.title,
      productType: products.productType,
      previewImageUrl: products.previewImageUrl,
    })
    .from(productOrders)
    .innerJoin(products, eq(productOrders.productId, products.id))
    .where(eq(productOrders.userId, user.id))
    .orderBy(desc(productOrders.createdAt));

  return c.json({ success: true, data: rows });
});
