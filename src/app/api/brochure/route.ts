import { NextRequest, NextResponse } from 'next/server';
import { getBrochure, saveBrochure } from '@/lib/redis';
import { logError } from '@/lib/logger';

// Serve the uploaded brochure PDF
export async function GET() {
  try {
    const brochure = await getBrochure();
    if (!brochure) {
      // Fall back to the static file if nothing uploaded yet
      return NextResponse.redirect(new URL('/brochure.pdf', process.env.NEXT_PUBLIC_APP_URL!));
    }
    return new NextResponse(new Uint8Array(brochure.data), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="${brochure.filename}"`,
        'Cache-Control':       'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    logError('Failed to serve brochure PDF', err, { route: '/api/brochure', method: 'GET', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Upload a new brochure PDF (max ~10 MB)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await saveBrochure(buffer, file.name);

    return NextResponse.json({ ok: true, filename: file.name, size: file.size });
  } catch (err) {
    logError('Failed to upload brochure PDF', err, { route: '/api/brochure', method: 'POST', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
