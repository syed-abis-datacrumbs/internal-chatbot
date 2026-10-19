import { NextRequest, NextResponse } from 'next/server';
import { getAIReply } from '@/lib/gemini';
import { wantsBrochure } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();
    if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 });

    if (wantsBrochure(message)) {
      return NextResponse.json({
        reply: `Here is the complete overview of the **Cortexa AI Changemakers Internship 2026**! 🎓\n\n• **Duration:** 4 Weeks (Intensive, Project-Driven)\n• **11 Tracks:** AI, Software Engineering, Cybersecurity, Marketing, HR, Sales, Finance, Operations, Customer Success, Product, Design\n• **20 Capstone Projects:** Hands-on industry case studies with working code, templates, and video walk-throughs.\n\nExplore all tracks and project briefs: [internship.datacrumbs.org](https://internship.datacrumbs.org)`,
        brochure: false,
      });
    }

    const reply = await getAIReply(message, history);

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Chat error:', msg);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
