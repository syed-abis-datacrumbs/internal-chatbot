/**
 * Dynamic Knowledge Service for Cortexa AI Changemakers Internship 2026.
 * Fetches real-time knowledge chunks and project definitions from the public endpoints:
 * - https://internship.datacrumbs.org/api/chatbot/knowledge
 * - https://internship.datacrumbs.org/api/projects
 */

export interface KnowledgeChunk {
  id: string;
  title: string;
  domain: string;
  difficulty: string;
  chunk_content: string;
  metadata?: Record<string, unknown>;
}

export interface RawProject {
  id: string;
  title: string;
  description: string;
  domain: string;
  difficulty: string;
  duration?: string;
  team_size?: string;
  tech_stack?: string[];
  learning_outcomes?: string[];
  points?: number;
  case_study?: {
    company?: string;
    scenario?: string;
    targetProblem?: string;
    sampleBenchmark?: string;
  };
  final_deliverable?: string;
  evaluation_criteria?: string[];
}

export interface KnowledgeResponse {
  success: boolean;
  program: string;
  total_projects: number;
  available_domains: string[];
  domain_breakdown: Record<string, number>;
  system_instructions: string;
  knowledge_chunks: KnowledgeChunk[];
  raw_projects: RawProject[];
}

const KNOWLEDGE_ENDPOINT = 'https://internship.datacrumbs.org/api/chatbot/knowledge';
const PROJECTS_ENDPOINT = 'https://internship.datacrumbs.org/api/projects';

// 10-minute cache TTL
const CACHE_TTL_MS = 10 * 60 * 1000;
let cachedData: KnowledgeResponse | null = null;
let lastFetchTime = 0;

/**
 * Fetch the complete knowledge base with in-memory caching and resilient fallback.
 */
export async function getInternshipKnowledge(): Promise<KnowledgeResponse> {
  const now = Date.now();
  if (cachedData && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedData;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(KNOWLEDGE_ENDPOINT, {
      signal: controller.signal,
      next: { revalidate: 600 },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: KnowledgeResponse = await res.json();
      if (data && data.success && Array.isArray(data.knowledge_chunks)) {
        cachedData = data;
        lastFetchTime = now;
        return data;
      }
    }
  } catch (err) {
    console.warn('[dynamicKnowledge] Failed to fetch live knowledge, using cache/fallback:', err instanceof Error ? err.message : err);
  }

  if (cachedData) return cachedData;

  // Static emergency fallback if endpoint is completely unreachable on initial start
  return {
    success: true,
    program: 'Cortexa AI Changemakers Internship 2026',
    total_projects: 20,
    available_domains: ['ai', 'swe', 'cybersecurity', 'marketing', 'hr', 'sales', 'finance', 'operations', 'customersuccess', 'product', 'design'],
    domain_breakdown: { ai: 2, swe: 2, cybersecurity: 2, marketing: 2, hr: 2, sales: 2, finance: 2, operations: 2, customersuccess: 2, product: 1, design: 1 },
    system_instructions: `You are the official Cortexa AI Internship Assistant. The internship runs for 4 weeks. Interns complete real-world capstone projects across 11 technical and business domains (AI, Software Engineering, Cybersecurity, Data, Product, HR, Marketing, Sales, Finance, Operations, Customer Success). Each project requires submitting a verified case study report, GitHub repository/templates, standard operating procedure (SOP), and a 3-5 minute video walk-through.`,
    knowledge_chunks: [],
    raw_projects: [],
  };
}

/**
 * Search projects directly via query parameters or local fallback.
 */
export async function searchProjects(params?: {
  domain?: string;
  difficulty?: string;
  search?: string;
}): Promise<RawProject[]> {
  try {
    const query = new URLSearchParams();
    if (params?.domain) query.set('domain', params.domain);
    if (params?.difficulty) query.set('difficulty', params.difficulty);
    if (params?.search) query.set('search', params.search);

    const url = `${PROJECTS_ENDPOINT}${query.toString() ? `?${query.toString()}` : ''}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.projects)) {
        return json.projects;
      }
    }
  } catch (err) {
    console.warn('[dynamicKnowledge] Live search failed, using local filter:', err instanceof Error ? err.message : err);
  }

  // Fallback to in-memory search
  const kb = await getInternshipKnowledge();
  let list = kb.raw_projects || [];
  if (params?.domain) {
    list = list.filter(p => p.domain?.toLowerCase() === params.domain?.toLowerCase());
  }
  if (params?.difficulty) {
    list = list.filter(p => p.difficulty?.toLowerCase() === params.difficulty?.toLowerCase());
  }
  if (params?.search) {
    const s = params.search.toLowerCase();
    list = list.filter(p =>
      p.title?.toLowerCase().includes(s) ||
      p.description?.toLowerCase().includes(s) ||
      p.tech_stack?.some(t => t.toLowerCase().includes(s))
    );
  }
  return list;
}

/**
 * Retrieve the most relevant markdown knowledge chunks for a user's question.
 */
export async function getRelevantKnowledgeChunks(userMessage: string, maxChunks = 4): Promise<string> {
  const kb = await getInternshipKnowledge();
  if (!kb.knowledge_chunks || kb.knowledge_chunks.length === 0) {
    return '';
  }

  const query = userMessage.toLowerCase();
  const scored = kb.knowledge_chunks.map(chunk => {
    let score = 0;
    const title = chunk.title.toLowerCase();
    const domain = chunk.domain.toLowerCase();
    const content = chunk.chunk_content.toLowerCase();

    // Exact domain mention (e.g., "cybersecurity", "swe", "marketing", "hr")
    if (query.includes(domain)) score += 10;
    if (domain === 'swe' && (query.includes('software') || query.includes('developer') || query.includes('coding'))) score += 10;
    if (domain === 'ai' && (query.includes('machine learning') || query.includes('data science') || query.includes('nlp') || query.includes('llm'))) score += 10;

    // Difficulty matching
    if (chunk.difficulty && query.includes(chunk.difficulty.toLowerCase())) score += 5;

    // Title keywords
    const words = title.split(/\s+/).filter(w => w.length > 3);
    for (const w of words) {
      if (query.includes(w)) score += 6;
    }

    // Technology keywords in content
    const techWords = ['python', 'react', 'fastapi', 'streamlit', 'docker', 'sql', 'langchain', 'openai', 'figma', 'notion', 'surferseo', 'zendesk', 'looker', 'power bi'];
    for (const tw of techWords) {
      if (query.includes(tw) && content.includes(tw)) score += 8;
    }

    // General term matching
    if (content.includes(query)) score += 4;

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // If top items scored above 0, return top scored chunks; otherwise return top 3 representative chunks
  const selected = scored[0].score > 0
    ? scored.filter(s => s.score > 0).slice(0, maxChunks).map(s => s.chunk.chunk_content)
    : scored.slice(0, 3).map(s => s.chunk.chunk_content);

  return selected.join('\n\n---\n\n');
}

/**
 * Builds the complete system prompt for the Gemini AI model, incorporating:
 * 1. Role & Program Identity (Cortexa AI Changemakers Internship 2026)
 * 2. 11 Available Domains / Tracks & Breakdown
 * 3. Dynamic relevant project chunks retrieved for the specific user query
 * 4. Guidelines for formatting and tone
 */
/**
 * Builds the base system prompt (program guidelines, track counts, rules, links)
 * suitable for viewing and editing in the Admin Panel.
 */
export async function buildInternshipBasePrompt(): Promise<string> {
  const kb = await getInternshipKnowledge();

  return `You are the official Internship Assistant for "${kb.program || 'Cortexa AI Changemakers Internship 2026'}".

## PROGRAM GUIDELINES
${kb.system_instructions ? `${kb.system_instructions}\n` : ''}- Official Portal: https://internship.datacrumbs.org
- Support & Contact: info@datacrumbs.org

## RESPONSE STYLE & WHATSAPP FORMATTING RULES (STRICT)
1. SPECIFY PROJECT COUNTS: When listing or mentioning tracks/domains to the user, always state the exact number of projects in that track using the real-time project counts provided below (e.g., "• Software Engineering: 3 projects\n• Marketing: 3 projects\n• AI: 2 projects\n• Cybersecurity: 2 projects...").
2. SINGLE BULLET ONLY: Never use nested bullets, double bullets, or indented dots (never write "• • " or "  • "). Every bulleted item must begin with exactly one single bullet symbol "• ".
3. DYNAMIC DELIVERABLES: Always refer to each project's specific "Final Deliverable", "Tech Stack", and "Case Study" from the live knowledge base below. Deliverables differ by domain (e.g. GitHub code for engineering tracks, templates/dashboards for business tracks) — always respect the project's exact requirements without assuming GitHub for every track.
4. NO RAW MARKDOWN HEADINGS: Never use '#', '##', or '###'. WhatsApp does NOT support markdown headers and displays them as ugly '#' symbols. Use *Bold text* for headings instead.
5. NO HORIZONTAL DIVIDERS: Never use '---', '___', or '***'.
6. CLEAN BULLETS: For bullet points, ALWAYS use '• ' (Unicode bullet symbol), NEVER use asterisks '*' or dashes '-' as bullet points. (e.g. write "• Track: AI", NOT "*  *Track:* AI").
7. WHATSAPP BOLD: WhatsApp uses a single asterisk for bold (e.g. *Title*). Never use double asterisks '**bold**' or nested '*  *'.
8. NO TECHNICAL UUIDs: Never output internal UUIDs or 'Project ID: ...' to users. Students only care about the Project Title, Track, and Tech Stack.
9. Tone: Friendly, inspiring, professional, and knowledgeable.
10. If a user asks how to apply or register, direct them to: https://internship.datacrumbs.org`;
}

/**
 * Builds the complete system prompt for Gemini:
 * 1. Uses the base prompt (either from MongoDB admin save or default)
 * 2. ALWAYS dynamically appends live program data (tracks, project counts) from the portal API
 * 3. Dynamically appends relevant project knowledge chunks matching the user's inquiry
 */
export async function buildInternshipSystemPrompt(userMessage?: string, basePromptOverride?: string): Promise<string> {
  const base = (basePromptOverride && basePromptOverride.trim()) || (await buildInternshipBasePrompt());
  const kb = await getInternshipKnowledge();

  const domainBreakdownText = kb.domain_breakdown
    ? Object.entries(kb.domain_breakdown)
        .map(([domain, count]) => `${domain.toUpperCase()} (${count} ${count === 1 ? 'project' : 'projects'})`)
        .join(', ')
    : (kb.available_domains?.join(', ') || '');

  const totalCount = kb.total_projects || (kb.domain_breakdown ? Object.values(kb.domain_breakdown).reduce((a, b) => a + b, 0) : 20);

  let relevantKnowledge = '';
  if (userMessage) {
    relevantKnowledge = await getRelevantKnowledgeChunks(userMessage);
  } else if (kb.knowledge_chunks && kb.knowledge_chunks.length > 0) {
    relevantKnowledge = kb.knowledge_chunks.slice(0, 3).map(c => c.chunk_content).join('\n\n---\n\n');
  }

  return `${base}

## REAL-TIME PROGRAM & TRACK DATA (AUTOMATICALLY FETCHED FROM LIVE PORTAL):
- Program: ${kb.program || 'Cortexa AI Changemakers Internship 2026'}
- Total Active Projects: ${totalCount} projects across all tracks
- Live Tracks & Project Counts: ${domainBreakdownText}
- Official Portal: https://internship.datacrumbs.org
- Support & Contact: info@datacrumbs.org

## DYNAMIC KNOWLEDGE BASE & RELEVANT PROJECTS (FROM LIVE API):
${relevantKnowledge}
`;
}
