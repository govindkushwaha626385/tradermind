// ──────────────────────────────────────────────
// TradeMind — File Upload Routes (Supabase Storage)
// POST /api/v1/uploads/screenshot
// POST /api/v1/uploads/audio
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/server/auth';
import { getSupabaseAdmin } from '@trademind/database';
import { configManager } from '@trademind/config';
import { apiError } from '@/lib/server/response';

export const runtime = 'nodejs';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];

async function ensureBucket(supabase: ReturnType<typeof getSupabaseAdmin>, bucketName: string) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === bucketName);
    if (!exists) {
      await supabase.storage.createBucket(bucketName, { public: true, fileSizeLimit: 15 * 1024 * 1024 });
    }
  } catch (err) {
    console.warn(`[Storage] ensureBucket warning for ${bucketName}:`, err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;

    const { path } = await params;
    const action = path?.[0];

    if (action === 'screenshot') return handleScreenshot(req, user.id);
    if (action === 'audio') return handleAudio(req, user.id);
    return apiError(`Route not found: POST /api/v1/uploads/${action}`, 404);
  } catch (err: unknown) {
    console.error('[Uploads POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

async function handleScreenshot(req: NextRequest, userId: string) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return apiError('No file provided. Attach a file with key "file"');

    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      return apiError(`Invalid image format (${file.type}). Allowed: PNG, JPEG, WebP, GIF`);
    }

    const maxMb = await configManager.get<number>('storage.screenshot_max_mb').catch(() => 5);
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return apiError(`Image size exceeds the ${maxMb}MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    }

    const supabase = getSupabaseAdmin();
    const bucket = 'trade-screenshots';
    await ensureBucket(supabase, bucket);

    const ext = (file.name.split('.').pop() || 'png').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `${userId}/${uniqueId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, { contentType: file.type, upsert: true });
    if (uploadError) {
      console.error('[Storage Error] Screenshot upload failed:', uploadError);
      return apiError(`Failed to store screenshot: ${uploadError.message}`, 500);
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return NextResponse.json({ success: true, data: { url: publicUrl, fileName: file.name, size: file.size, mimeType: file.type, path: storagePath } });
  } catch (err: any) {
    console.error('[Upload Exception]:', err);
    return apiError(err.message || 'An unexpected error occurred during upload', 500);
  }
}

async function handleAudio(req: NextRequest, userId: string) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return apiError('No file provided. Attach a file with key "file"');

    if (!ALLOWED_AUDIO_TYPES.includes(file.type.toLowerCase()) && !file.type.startsWith('audio/')) {
      return apiError(`Invalid audio format (${file.type}). Allowed: WebM, MP4, MP3, OGG, WAV, M4A`);
    }

    const maxMb = await configManager.get<number>('storage.audio_max_mb').catch(() => 10);
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return apiError(`Audio file exceeds the ${maxMb}MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    }

    const supabase = getSupabaseAdmin();
    const bucket = 'trade-audio';
    await ensureBucket(supabase, bucket);

    const ext = (file.name.split('.').pop() || 'webm').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `${userId}/${uniqueId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, { contentType: file.type, upsert: true });
    if (uploadError) {
      console.error('[Storage Error] Audio upload failed:', uploadError);
      return apiError(`Failed to store audio note: ${uploadError.message}`, 500);
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return NextResponse.json({ success: true, data: { url: publicUrl, fileName: file.name, size: file.size, mimeType: file.type, path: storagePath } });
  } catch (err: any) {
    console.error('[Upload Exception]:', err);
    return apiError(err.message || 'An unexpected error occurred during audio upload', 500);
  }
}
