import { NextRequest, NextResponse } from 'next/server';
import { getAIReply } from '@/lib/gemini';
import { retrieveContext } from '@/lib/rag';
import { wantsBrochure } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();
    if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 });

    if (wantsBrochure(message)) {
      return NextResponse.json({
        reply: `Here's our complete bootcamp brochure!\n\n📄 [Download Brochure](/brochure.pdf)\n\nIt covers the full curriculum, pricing (Rs 7,500/month), internship details, and instructor profiles. Let me know if you have any questions!`,
        brochure: true,
      });
    }

    const context = await retrieveContext(message);
    const reply = await getAIReply(message, history, context);

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Chat error:', msg);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
