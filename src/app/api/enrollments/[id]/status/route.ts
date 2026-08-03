import { NextRequest, NextResponse } from 'next/server';
import { updateEnrollmentState, getAllEnrollments } from '@/lib/redis';
import { updateSheetStatus } from '@/lib/google';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const phone  = decodeURIComponent(id);

  // Read body safely — Next.js 15 body streaming can return empty on some runtimes
  let status: 'approved' | 'rejected';
  try {
    const raw = await req.text();
    const body = JSON.parse(raw) as { status?: string };
    if (body.status !== 'approved' && body.status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    status = body.status;
  } catch {
    return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 });
  }

  await updateEnrollmentState(phone, status);

  // Update Google Sheet row
  const all     = await getAllEnrollments();
  const session = all.find(s => s.phone === phone);
  if (session?.sheetRowIndex && session.sheetRowIndex > 0) {
    await updateSheetStatus(
      session.sheetRowIndex,
      status === 'approved' ? 'Approved ✅' : 'Rejected ❌',
    );
  }

  // Notify the student on WhatsApp
  const msg = status === 'approved'
    ? `🎉 Great news! Your payment has been *verified* and your enrollment in the DataCrumbs AI & Data Science Bootcamp is *confirmed*!\n\nWelcome to the family! Our team will be in touch with next steps. 🚀`
    : `We're sorry, but we couldn't verify your payment screenshot. Please send a clear screenshot showing the payment details, or contact us at +92 329 2020497 for assistance.`;

  await sendWhatsAppMessage(phone, msg);

  return NextResponse.json({ ok: true });
}
