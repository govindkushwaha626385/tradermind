// ──────────────────────────────────────────────
// TradeMind — File Upload Routes (Supabase Storage)
//
// Handles screenshot uploads for trade charts and
// voice note audio uploads for trade reflections.
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getSupabaseAdmin } from '@trademind/database';
import { configManager } from '@trademind/config';

export const uploadsRouter = new Hono();
uploadsRouter.use('*', authMiddleware);

const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
];

const ALLOWED_AUDIO_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/m4a',
  'audio/x-m4a',
];

/**
 * Helper to ensure a public storage bucket exists.
 */
async function ensureBucket(supabase: ReturnType<typeof getSupabaseAdmin>, bucketName: string) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === bucketName);
    if (!exists) {
      await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 15 * 1024 * 1024,
      });
    }
  } catch (err) {
    // If listing/creating buckets fails (e.g. permission or network), proceed to attempt upload
    console.warn(`[Storage] ensureBucket warning for ${bucketName}:`, err);
  }
}

/**
 * POST /uploads/screenshot — Upload a trade chart screenshot
 */
uploadsRouter.post('/screenshot', async (c) => {
  const user = c.get('user');

  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || typeof file === 'string') {
      return c.json(
        { success: false, error: { message: 'No file provided. Attach a file with key "file"' } },
        400,
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      return c.json(
        {
          success: false,
          error: {
            message: `Invalid image format (${file.type}). Allowed: PNG, JPEG, WebP, GIF`,
          },
        },
        400,
      );
    }

    const maxMb = await configManager.get<number>('storage.screenshot_max_mb').catch(() => 5);
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return c.json(
        {
          success: false,
          error: {
            message: `Image size exceeds the ${maxMb}MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
          },
        },
        400,
      );
    }

    const supabase = getSupabaseAdmin();
    const bucket = 'trade-screenshots';
    await ensureBucket(supabase, bucket);

    const ext = file.name.split('.').pop() || 'png';
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `${user.id}/${uniqueId}.${cleanExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      console.error('[Storage Error] Screenshot upload failed:', uploadError);
      return c.json(
        {
          success: false,
          error: {
            message: `Failed to store screenshot: ${uploadError.message}`,
          },
        },
        500,
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    return c.json({
      success: true,
      data: {
        url: publicUrl,
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        path: storagePath,
      },
    });
  } catch (err: any) {
    console.error('[Upload Exception]:', err);
    return c.json(
      {
        success: false,
        error: {
          message: err.message || 'An unexpected error occurred during upload',
        },
      },
      500,
    );
  }
});

/**
 * POST /uploads/audio — Upload a trade reflection voice note
 */
uploadsRouter.post('/audio', async (c) => {
  const user = c.get('user');

  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || typeof file === 'string') {
      return c.json(
        { success: false, error: { message: 'No file provided. Attach a file with key "file"' } },
        400,
      );
    }

    if (!ALLOWED_AUDIO_TYPES.includes(file.type.toLowerCase()) && !file.type.startsWith('audio/')) {
      return c.json(
        {
          success: false,
          error: {
            message: `Invalid audio format (${file.type}). Allowed: WebM, MP4, MP3, OGG, WAV, M4A`,
          },
        },
        400,
      );
    }

    const maxMb = await configManager.get<number>('storage.audio_max_mb').catch(() => 10);
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return c.json(
        {
          success: false,
          error: {
            message: `Audio file exceeds the ${maxMb}MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
          },
        },
        400,
      );
    }

    const supabase = getSupabaseAdmin();
    const bucket = 'trade-audio';
    await ensureBucket(supabase, bucket);

    const ext = file.name.split('.').pop() || 'webm';
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `${user.id}/${uniqueId}.${cleanExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      console.error('[Storage Error] Audio upload failed:', uploadError);
      return c.json(
        {
          success: false,
          error: {
            message: `Failed to store audio note: ${uploadError.message}`,
          },
        },
        500,
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    return c.json({
      success: true,
      data: {
        url: publicUrl,
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        path: storagePath,
      },
    });
  } catch (err: any) {
    console.error('[Upload Exception]:', err);
    return c.json(
      {
        success: false,
        error: {
          message: err.message || 'An unexpected error occurred during audio upload',
        },
      },
      500,
    );
  }
});
