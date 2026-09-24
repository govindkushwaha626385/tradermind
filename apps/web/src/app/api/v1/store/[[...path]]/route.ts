// ──────────────────────────────────────────────
// TradeMind — Digital Products Store Routes
// GET  /api/v1/store/products
// GET  /api/v1/store/products/[id]
// POST /api/v1/store/purchase/[productId]
// POST /api/v1/store/verify-payment
// GET  /api/v1/store/my-purchases
// POST /api/v1/store/access/[productId]
// GET  /api/v1/store/orders
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabase, products, productOrders, productAccess } from '@trademind/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '@/lib/server/auth';
import { ok, notFound, apiError, parseBody } from '@/lib/server/response';
import { recordAdminAudit } from '@/lib/server/services/admin-audit.service';
import crypto from 'crypto';

export const runtime = 'nodejs';

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  productId: z.string().uuid(),
  orderId: z.string().uuid(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const [section, id] = path ?? [];

    if (section === 'products') {
      const db = getDatabase();
      if (id) {
        const [product] = await db
          .select({
            id: products.id, title: products.title, description: products.description,
            longDescription: products.longDescription, productType: products.productType,
            price: products.price, currency: products.currency,
            previewImageUrl: products.previewImageUrl, videoUrl: products.videoUrl,
            tags: products.tags, metadata: products.metadata, isFree: products.isFree,
            totalSales: products.totalSales, createdAt: products.createdAt,
          })
          .from(products)
          .where(and(eq(products.id, id), eq(products.isActive, true)))
          .limit(1);
        if (!product) return notFound('Product not found');
        return ok(product);
      }
      // Public: List products
      const url = new URL(req.url);
      const typeFilter = url.searchParams.get('type');
      const rows = await db
        .select({
          id: products.id, title: products.title, description: products.description,
          productType: products.productType, price: products.price, currency: products.currency,
          previewImageUrl: products.previewImageUrl, tags: products.tags, metadata: products.metadata,
          isFree: products.isFree, totalSales: products.totalSales, sortOrder: products.sortOrder,
          createdAt: products.createdAt,
        })
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(products.sortOrder, desc(products.createdAt));
      return ok(typeFilter ? rows.filter((r) => r.productType === typeFilter) : rows);
    }

    // Auth-required routes
    const { user, error } = await authenticate(req);
    if (error) return error;

    if (section === 'my-purchases') {
      const db = getDatabase();
      const rows = await db
        .select({
          accessId: productAccess.id, grantReason: productAccess.grantReason,
          downloadCount: productAccess.downloadCount, lastAccessedAt: productAccess.lastAccessedAt,
          accessGrantedAt: productAccess.accessGrantedAt, productId: products.id,
          title: products.title, description: products.description,
          productType: products.productType, previewImageUrl: products.previewImageUrl,
          videoUrl: products.videoUrl, tags: products.tags, metadata: products.metadata,
          isFree: products.isFree,
        })
        .from(productAccess)
        .innerJoin(products, eq(productAccess.productId, products.id))
        .where(eq(productAccess.userId, user.id))
        .orderBy(desc(productAccess.accessGrantedAt));
      return ok(rows);
    }

    if (section === 'orders') {
      const db = getDatabase();
      const rows = await db
        .select({
          orderId: productOrders.id, status: productOrders.status,
          amountPaid: productOrders.amountPaid, currency: productOrders.currency,
          provider: productOrders.provider, paidAt: productOrders.paidAt,
          createdAt: productOrders.createdAt, productId: products.id,
          title: products.title, productType: products.productType,
          previewImageUrl: products.previewImageUrl,
        })
        .from(productOrders)
        .innerJoin(products, eq(productOrders.productId, products.id))
        .where(eq(productOrders.userId, user.id))
        .orderBy(desc(productOrders.createdAt));
      return ok(rows);
    }

    return apiError('Route not found', 404);
  } catch (err: unknown) {
    console.error('[Store GET] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const [section, id] = path ?? [];

    if (section === 'verify-payment') {
      const { user, error } = await authenticate(req);
      if (error) return error;
      const { data: body, error: bodyErr } = await parseBody(req, verifyPaymentSchema);
      if (bodyErr) return bodyErr;
      const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';
      const expectedSig = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${body.razorpayOrderId}|${body.razorpayPaymentId}`)
        .digest('hex');
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSig, 'hex'),
        Buffer.from(body.razorpaySignature, 'hex'),
      );
      if (!isValid) return apiError('Payment signature verification failed.');
      const db = getDatabase();
      const [order] = await db
        .update(productOrders)
        .set({
          providerPaymentId: body.razorpayPaymentId,
          providerSignature: body.razorpaySignature,
          status: 'paid',
          paidAt: new Date(),
          rawProviderData: { orderId: body.razorpayOrderId, paymentId: body.razorpayPaymentId },
        })
        .where(and(
          eq(productOrders.id, body.orderId),
          eq(productOrders.userId, user.id),
          eq(productOrders.productId, body.productId),
        ))
        .returning();
      if (!order) return notFound('Order not found.');
      await db.insert(productAccess).values({
        userId: user.id, productId: body.productId, orderId: order.id,
        grantReason: 'purchased', accessGrantedAt: new Date(),
      }).onConflictDoNothing();
      await db.update(products)
        .set({ totalSales: sql`${products.totalSales} + 1` })
        .where(eq(products.id, body.productId));
      await recordAdminAudit({
        actor: { id: user.id, email: user.email }, action: 'PRODUCT_PURCHASED',
        entityType: 'product_order', entityId: order.id,
        metadata: { productId: body.productId, amount: order.amountPaid, provider: 'razorpay' },
      });
      return ok({ hasAccess: true, orderId: order.id });
    }

    if (section === 'purchase' && id) {
      const { user, error } = await authenticate(req);
      if (error) return error;
      const db = getDatabase();
      const [product] = await db.select().from(products)
        .where(and(eq(products.id, id), eq(products.isActive, true))).limit(1);
      if (!product) return notFound('Product not found');
      const [existingAccess] = await db.select({ id: productAccess.id }).from(productAccess)
        .where(and(eq(productAccess.userId, user.id), eq(productAccess.productId, id))).limit(1);
      if (existingAccess) return apiError('You already have access to this product.', 409);
      if (product.isFree || product.price === 0) {
        const [order] = await db.insert(productOrders).values({
          userId: user.id, productId: id, amountPaid: 0,
          currency: product.currency, provider: 'free', status: 'paid', paidAt: new Date(),
        }).returning();
        if (!order) throw new Error('Failed to create free order');
        await db.insert(productAccess).values({
          userId: user.id, productId: id, orderId: order.id,
          grantReason: 'free', accessGrantedAt: new Date(),
        });
        await db.update(products).set({ totalSales: sql`${products.totalSales} + 1` }).where(eq(products.id, id));
        await recordAdminAudit({
          actor: { id: user.id, email: user.email }, action: 'PRODUCT_ACCESS_GRANTED_FREE',
          entityType: 'product', entityId: id, metadata: { productTitle: product.title },
        });
        return ok({ isFree: true, hasAccess: true });
      }
      const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
      const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET)
        return apiError('Payment gateway not configured.', 503);
      const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
      const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: product.price,
          currency: product.currency,
          receipt: `prod_${id.slice(0, 8)}_${Date.now()}`,
          notes: { productId: id, userId: user.id },
        }),
      });
      if (!rpRes.ok) {
        console.error('[Store] Razorpay order creation failed', await rpRes.text());
        return apiError('Failed to create payment order.', 500);
      }
      const rpOrder = await rpRes.json() as { id: string };
      const [pendingOrder] = await db.insert(productOrders).values({
        userId: user.id, productId: id, amountPaid: product.price,
        currency: product.currency, provider: 'razorpay',
        providerOrderId: rpOrder.id, status: 'pending',
      }).returning();
      if (!pendingOrder) throw new Error('Failed to persist pending order');
      return ok({
        orderId: pendingOrder.id, razorpayOrderId: rpOrder.id,
        razorpayKeyId: RAZORPAY_KEY_ID, amount: product.price,
        currency: product.currency, productTitle: product.title,
      });
    }

    if (section === 'access' && id) {
      const { user, error } = await authenticate(req);
      if (error) return error;
      const db = getDatabase();
      const [access] = await db.select().from(productAccess)
        .where(and(eq(productAccess.userId, user.id), eq(productAccess.productId, id))).limit(1);
      if (!access) return apiError('You do not have access to this product.', 403);
      const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (!product) return notFound('Product not found.');
      await db.update(productAccess)
        .set({ downloadCount: sql`${productAccess.downloadCount} + 1`, lastAccessedAt: new Date() })
        .where(eq(productAccess.id, access.id));
      return ok({
        downloadUrl: product.downloadUrl, videoUrl: product.videoUrl,
        title: product.title, productType: product.productType,
      });
    }

    return apiError('Route not found', 404);
  } catch (err: unknown) {
    console.error('[Store POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
