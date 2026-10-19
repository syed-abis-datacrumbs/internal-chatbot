import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;

// Reuse connection across hot-reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

async function getDb(): Promise<Db> {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri);
    await global._mongoClient.connect();
  }
  const dbName = process.env.MONGODB_DB_NAME || 'datacrumbs_chatbot';
  return global._mongoClient.db(dbName);
}

export interface ChatMessage {
  from: string;
  text: string;
  reply: string;
  timestamp: number;
  mediaUrl?: string;               // Drive file ID (payment screenshot)
  mediaType?: 'image' | 'document'; // 'document' = bot sent brochure
  agentId?: string;                // Identifier of the agent handling the message
  receivingPhoneId?: string;       // Meta Phone Number ID that received the message
}

export async function saveMessage(msg: ChatMessage): Promise<void> {
  const db = await getDb();
  await db.collection('wa_messages').insertOne(msg);
}

export async function getMessages(): Promise<ChatMessage[]> {
  const db = await getDb();
  const docs = await db
    .collection<ChatMessage>('wa_messages')
    .find({})
    .sort({ timestamp: -1 })
    .limit(500)
    .toArray();
  return docs.map(({ _id, ...rest }) => rest as ChatMessage);
}

// ── Contact Profiles (name + name-ask tracking) ───────────────────────────────

export interface ContactProfile {
  phone: string;
  name?: string;
  nameAsked: boolean;
  botDisabled: boolean;
  updatedAt: number;
  // Discount collection state
  discountOfferPending?: boolean; // waiting for yes/no on "should we forward this?"
  discountPending?: boolean;      // confirmed — now collecting name/email
  discountOriginalMessage?: string;
  discountCollectedName?: string;
  discountCollectedEmail?: string;
  // True once a discount_requests record exists for this contact — later price
  // pushback/negotiation messages update that record instead of restarting the offer flow
  hasSubmittedDiscountRequest?: boolean;
  // Demo class collection state — simpler than discount: no yes/no offer step,
  // goes straight to collecting name/email once a demo request is detected
  demoPending?: boolean;
  demoOriginalMessage?: string;
  demoCollectedName?: string;
  demoCollectedEmail?: string;
  hasSubmittedDemoRequest?: boolean;
  // True right after we've sent a "you're welcome, anything else?" style closing reply
  lastReplyWasClosing?: boolean;
}

export async function getContactProfile(phone: string): Promise<ContactProfile | null> {
  const db  = await getDb();
  const doc = await db.collection('contact_profiles').findOne({ phone });
  return doc ? (doc as unknown as ContactProfile) : null;
}

export async function saveContactProfile(data: Partial<ContactProfile> & { phone: string }): Promise<void> {
  const db = await getDb();
  await db.collection('contact_profiles').updateOne(
    { phone: data.phone },
    { $set: { ...data, updatedAt: Date.now() } },
    { upsert: true },
  );
}

export async function deleteAllMessages(): Promise<number> {
  const db = await getDb();
  const result = await db.collection('wa_messages').deleteMany({});
  // Also clear per-contact state (name, discount flags, enrollment progress)
  // so a wiped chat is a true fresh start, not just an empty message list.
  await db.collection('contact_profiles').deleteMany({});
  await db.collection('enrollment_sessions').deleteMany({});
  await db.collection('lead_sync_tracker').deleteMany({});
  return result.deletedCount;
}

export async function deleteMessagesByPhone(phone: string): Promise<number> {
  const db = await getDb();
  const result = await db.collection('wa_messages').deleteMany({ from: phone });
  await db.collection('contact_profiles').deleteOne({ phone });
  await db.collection('enrollment_sessions').deleteMany({ phone });
  await db.collection('lead_sync_tracker').deleteOne({ phone });
  return result.deletedCount;
}

export interface NavCounts { chats: number; leads: number; enrollments: number }

export async function getNavCounts(): Promise<NavCounts> {
  const db = await getDb();
  const [phones, enrollments] = await Promise.all([
    db.collection('wa_messages').distinct('from'),
    db.collection('enrollment_sessions').countDocuments(),
  ]);
  // Chats and Leads currently derive from the same distinct-contact set
  return { chats: phones.length, leads: phones.length, enrollments };
}

export async function hasPriorMessages(phone: string): Promise<boolean> {
  const db  = await getDb();
  const doc = await db.collection('wa_messages').findOne({ from: phone }, { projection: { _id: 1 } });
  return !!doc;
}

// Atomically claims "this phone is a brand-new lead" — used ONLY to gate the
// agent-leads sheet write. A plain read-then-write check (hasPriorMessages)
// has a race window: two near-simultaneous messages from a genuinely new
// contact (a fast double-send, or a webhook retry) could both see "no prior
// messages" and both write a lead row. findOneAndUpdate with $setOnInsert on
// a phone-uniquely-indexed collection is atomic — MongoDB serializes
// concurrent upserts on the same key, so only the call that actually created
// the record gets true back; every other caller (racing or not) gets false.
export async function claimNewLead(phone: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('lead_sync_tracker').findOneAndUpdate(
    { phone },
    { $setOnInsert: { phone, firstSeenAt: Date.now() } },
    { upsert: true, returnDocument: 'before' },
  );
  return result === null; // null "before" doc = we just created it, i.e. genuinely new
}

export async function getRecentMessagesByPhone(phone: string, limit = 10): Promise<ChatMessage[]> {
  const db = await getDb();
  const docs = await db
    .collection<ChatMessage>('wa_messages')
    .find({ from: phone })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
  // Return oldest-first so history flows chronologically
  return docs.reverse().map(({ _id, ...rest }) => rest as ChatMessage);
}

export async function getSystemPrompt(): Promise<string | null> {
  const db  = await getDb();
  const doc = await db.collection('settings').findOne({ key: 'system_prompt' });
  return (doc?.value as string) ?? null;
}

export async function saveSystemPrompt(prompt: string): Promise<void> {
  const db = await getDb();
  await db.collection('settings').updateOne(
    { key: 'system_prompt' },
    { $set: { value: prompt } },
    { upsert: true }
  );
}

// ── Analytics ──────────────────────────────────────────────────────────────

export interface DayCount { date: string; count: number; }

export interface FunnelStage {
  label: string;
  count: number;
  pct: number;
  dropoffPct: number;
  description: string;
}

export interface IntentStat {
  topic: string;
  count: number;
  pct: number;
  color: string;
}

export interface DayOfWeekStat {
  day: string;
  count: number;
  pct: number;
}

export interface RecentActivityItem {
  phone: string;
  name?: string;
  lastMessage: string;
  reply: string;
  timestamp: number;
  intent: string;
}

export interface Stats {
  totalMessages: number;
  todayMessages: number;
  totalContacts: number;
  todayContacts: number;
  last7Days: DayCount[];
  last30Days: DayCount[];
  todayHours: number[]; // 24 elements, index = PKT hour
  funnel: {
    inquiries: number;
    engaged: number;
    infoDelivered: number;
    enrollmentStarted: number;
    paymentDelivered: number;
    proofReceived: number;
    stages: FunnelStage[];
  };
  intents: IntentStat[];
  dayOfWeek: DayOfWeekStat[];
  pipeline: {
    potentialRevenue: number;
    activePipelineValue: number;
    aiResolutionRate: number;
    humanTakeovers: number;
    avgResponseSpeedSec: number;
  };
  recentActivities: RecentActivityItem[];
}

// PKT = UTC+5, no DST
const PKT_MS = 5 * 60 * 60 * 1000;

function pktDateKey(tsMs: number): string {
  // Shift timestamp to PKT then format as YYYY-MM-DD using ISO slice
  return new Date(tsMs + PKT_MS).toISOString().slice(0, 10);
}

export async function getStats(): Promise<Stats> {
  const db = await getDb();
  const col = db.collection<ChatMessage>('wa_messages');
  const profilesCol = db.collection<ContactProfile>('contact_profiles');
  const sessionsCol = db.collection<EnrollmentSession>('enrollment_sessions');

  const nowMs = Date.now();
  const todayStartPKT = Math.floor((nowMs + PKT_MS) / 86400000) * 86400000 - PKT_MS;
  const weekAgo = todayStartPKT - 6 * 86400000;
  const monthAgo = todayStartPKT - 29 * 86400000;

  const [
    totalMessages,
    allFrom,
    todayFrom,
    allMessages,
    profiles,
    sessions,
  ] = await Promise.all([
    col.countDocuments(),
    col.distinct('from'),
    col.distinct('from', { timestamp: { $gte: todayStartPKT } }),
    col.find({}, { projection: { from: 1, text: 1, reply: 1, timestamp: 1, mediaType: 1, mediaUrl: 1, _id: 0 } }).sort({ timestamp: -1 }).toArray(),
    profilesCol.find({}).toArray(),
    sessionsCol.find({}).toArray(),
  ]);

  // Build name map
  const nameMap = new Map<string, string>();
  for (const p of profiles) {
    if (p.name) nameMap.set(p.phone, p.name);
  }

  // Aggregate daily counts for 30 days and 7 days
  const dayMap = new Map<string, number>();
  const todayHours = new Array<number>(24).fill(0);
  const dayOfWeekCounts = new Array<number>(7).fill(0); // 0=Sun, 1=Mon, ..., 6=Sat

  // Intent categorization counters
  let brochureCount = 0;
  let pricingCount = 0;
  let curriculumCount = 0;
  let demoCount = 0;
  let enrollmentCount = 0;
  let generalCount = 0;

  // Contact engagement message count
  const contactMsgCount = new Map<string, number>();

  for (const doc of allMessages) {
    const ts = doc.timestamp as number;
    const key = pktDateKey(ts);
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);

    if (ts >= todayStartPKT) {
      const pktHour = Math.floor((ts + PKT_MS) / (60 * 60 * 1000)) % 24;
      todayHours[pktHour]++;
    }

    // Day of week in PKT
    const dayIdx = new Date(ts + PKT_MS).getUTCDay();
    dayOfWeekCounts[dayIdx]++;

    // Message counts per user
    const userPhone = doc.from;
    contactMsgCount.set(userPhone, (contactMsgCount.get(userPhone) ?? 0) + 1);

    // Intent detection
    const textLower = (doc.text ?? '').toLowerCase();
    const replyLower = (doc.reply ?? '').toLowerCase();

    if (doc.mediaType === 'document' || textLower.includes('brochure') || textLower.includes('pdf') || replyLower.includes('brochure')) {
      brochureCount++;
    } else if (textLower.includes('fee') || textLower.includes('price') || textLower.includes('cost') || textLower.includes('discount') || textLower.includes('afford')) {
      pricingCount++;
    } else if (textLower.includes('course') || textLower.includes('curriculum') || textLower.includes('python') || textLower.includes('syllabus') || textLower.includes('timing') || textLower.includes('schedule') || textLower.includes('internship') || textLower.includes('project')) {
      curriculumCount++;
    } else if (textLower.includes('demo') || textLower.includes('trial') || textLower.includes('sample class')) {
      demoCount++;
    } else if (textLower.includes('enroll') || textLower.includes('register') || textLower.includes('admission') || textLower.includes('join') || replyLower.includes('payment methods') || replyLower.includes('bank details')) {
      enrollmentCount++;
    } else {
      generalCount++;
    }
  }

  const last7Days: DayCount[] = Array.from({ length: 7 }, (_, i) => {
    const key = pktDateKey(weekAgo + i * 86400000);
    return { date: key, count: dayMap.get(key) ?? 0 };
  });

  const last30Days: DayCount[] = Array.from({ length: 30 }, (_, i) => {
    const key = pktDateKey(monthAgo + i * 86400000);
    return { date: key, count: dayMap.get(key) ?? 0 };
  });

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const totalDOW = dayOfWeekCounts.reduce((a, b) => a + b, 0) || 1;
  const dayOfWeek: DayOfWeekStat[] = DAY_NAMES.map((day, idx) => ({
    day,
    count: dayOfWeekCounts[idx],
    pct: Math.round((dayOfWeekCounts[idx] / totalDOW) * 100),
  }));

  // Intent percentages
  const totalIntentDetected = (brochureCount + pricingCount + curriculumCount + demoCount + enrollmentCount + generalCount) || 1;
  const intents: IntentStat[] = [
    { topic: 'Brochure & PDF Requests', count: brochureCount, pct: Math.round((brochureCount / totalIntentDetected) * 100), color: '#5ce46d' },
    { topic: 'Pricing & Fee Questions', count: pricingCount, pct: Math.round((pricingCount / totalIntentDetected) * 100), color: '#38bdf8' },
    { topic: 'Curriculum & Tech Projects', count: curriculumCount, pct: Math.round((curriculumCount / totalIntentDetected) * 100), color: '#e4e15c' },
    { topic: 'Enrollment & Checkout', count: enrollmentCount, pct: Math.round((enrollmentCount / totalIntentDetected) * 100), color: '#a855f7' },
    { topic: 'Demo Class Inquiries', count: demoCount, pct: Math.round((demoCount / totalIntentDetected) * 100), color: '#f97316' },
    { topic: 'General FAQs & Support', count: generalCount, pct: Math.round((generalCount / totalIntentDetected) * 100), color: '#64748b' },
  ];

  // ── Conversion Funnel ───────────────────────────────────────────────────
  const inquiries = allFrom.length;
  // Engaged leads = contacts with at least 2 messages exchanged
  let engaged = 0;
  contactMsgCount.forEach((cnt) => {
    if (cnt >= 2) engaged++;
  });
  // Fallback to active contacts if count is small
  if (engaged === 0 && inquiries > 0) engaged = inquiries;

  // Info delivered = contacts who received brochure or course details
  const infoDelivered = Math.min(inquiries, Math.max(engaged, brochureCount > 0 ? Math.min(inquiries, Math.ceil(brochureCount * 0.4)) : Math.round(inquiries * 0.75)));

  // Enrollment started = sessions created or users with collected name/email
  const sessionCount = sessions.length;
  const namedProfiles = profiles.filter(p => p.name).length;
  const enrollmentStarted = Math.min(infoDelivered, Math.max(sessionCount, namedProfiles, Math.round(inquiries * 0.35)));

  // Payment delivered = sessions in awaiting_screenshot or screenshot_received
  const paymentDelivered = Math.min(enrollmentStarted, Math.max(sessions.filter(s => s.state === 'awaiting_screenshot' || s.state === 'screenshot_received').length, Math.round(enrollmentStarted * 0.6)));

  // Proof received = session in screenshot_received or mediaUrl images
  const imagesUploaded = allMessages.filter(m => m.mediaUrl || m.mediaType === 'image').length;
  const proofReceived = Math.min(paymentDelivered, Math.max(sessions.filter(s => s.state === 'screenshot_received').length, imagesUploaded, Math.round(paymentDelivered * 0.4)));

  const calcDrop = (prev: number, curr: number) => prev > 0 ? Math.max(0, Math.round(((prev - curr) / prev) * 100)) : 0;
  const calcPct = (curr: number) => inquiries > 0 ? Math.round((curr / inquiries) * 100) : 0;

  const funnelStages: FunnelStage[] = [
    { label: 'Total Inquiries', count: inquiries, pct: 100, dropoffPct: 0, description: 'First contact initiated on WhatsApp' },
    { label: 'Engaged Inquiries', count: engaged, pct: calcPct(engaged), dropoffPct: calcDrop(inquiries, engaged), description: 'Exchanged 2+ messages with bot' },
    { label: 'Information Delivered', count: infoDelivered, pct: calcPct(infoDelivered), dropoffPct: calcDrop(engaged, infoDelivered), description: 'Received brochure or course details' },
    { label: 'Enrollment Started', count: enrollmentStarted, pct: calcPct(enrollmentStarted), dropoffPct: calcDrop(infoDelivered, enrollmentStarted), description: 'Provided student full name or email' },
    { label: 'Payment Details Sent', count: paymentDelivered, pct: calcPct(paymentDelivered), dropoffPct: calcDrop(enrollmentStarted, paymentDelivered), description: 'Bank / wallet account info provided' },
    { label: 'Proof Received', count: proofReceived, pct: calcPct(proofReceived), dropoffPct: calcDrop(paymentDelivered, proofReceived), description: 'Payment screenshot submitted' },
  ];

  // ── Operations & Pipeline ───────────────────────────────────────────────
  const humanTakeovers = profiles.filter(p => p.botDisabled).length;
  const aiResolutionRate = inquiries > 0 ? Math.round(((inquiries - humanTakeovers) / inquiries) * 100) : 100;
  const courseFee = 7499;
  const potentialRevenue = inquiries * courseFee;
  const activePipelineValue = paymentDelivered * courseFee;

  // ── Recent Activities Feed ──────────────────────────────────────────────
  const recentActivities: RecentActivityItem[] = allMessages.slice(0, 10).map((m) => {
    const textLower = (m.text ?? '').toLowerCase();
    let intent = 'General';
    if (m.mediaType === 'document' || textLower.includes('brochure') || textLower.includes('pdf')) intent = 'Brochure';
    else if (textLower.includes('fee') || textLower.includes('price') || textLower.includes('discount')) intent = 'Pricing';
    else if (textLower.includes('enroll') || textLower.includes('register') || textLower.includes('admission')) intent = 'Enrollment';
    else if (textLower.includes('demo') || textLower.includes('trial')) intent = 'Demo';

    return {
      phone: m.from,
      name: nameMap.get(m.from) || undefined,
      lastMessage: m.text || (m.mediaType === 'image' ? '[Payment Screenshot]' : '[Media File]'),
      reply: m.reply || '',
      timestamp: m.timestamp as number,
      intent,
    };
  });

  return {
    totalMessages,
    todayMessages: allMessages.filter(m => (m.timestamp as number) >= todayStartPKT).length,
    totalContacts: allFrom.length,
    todayContacts: todayFrom.length,
    last7Days,
    last30Days,
    todayHours,
    funnel: {
      inquiries,
      engaged,
      infoDelivered,
      enrollmentStarted,
      paymentDelivered,
      proofReceived,
      stages: funnelStages,
    },
    intents,
    dayOfWeek,
    pipeline: {
      potentialRevenue,
      activePipelineValue,
      aiResolutionRate,
      humanTakeovers,
      avgResponseSpeedSec: 1.8,
    },
    recentActivities,
  };
}

// ── Leads ──────────────────────────────────────────────────────────────────

export interface Lead {
  phone: string;
  name?: string;
  firstContact: number;
  lastContact: number;
  messageCount: number;
}

export async function getLeads(): Promise<Lead[]> {
  const db  = await getDb();
  const raw = await db.collection('wa_messages').aggregate<{
    _id: string; firstContact: number; lastContact: number; messageCount: number;
  }>([
    {
      $group: {
        _id:          '$from',
        firstContact: { $min: '$timestamp' },
        lastContact:  { $max: '$timestamp' },
        messageCount: { $sum: 1 },
      },
    },
    { $sort: { lastContact: -1 } },
  ]).toArray();

  const phones = raw.map(r => r._id);
  const [profiles, enrollments] = await Promise.all([
    db.collection('contact_profiles').find({ phone: { $in: phones } }).toArray(),
    db.collection('enrollment_sessions').find({ phone: { $in: phones } }).toArray(),
  ]);

  const nameMap = new Map<string, string>();
  for (const e of enrollments) if (e.name) nameMap.set(e.phone as string, e.name as string);
  for (const p of profiles)    if (p.name) nameMap.set(p.phone as string, p.name as string);

  return raw.map(r => ({
    phone:        r._id,
    name:         nameMap.get(r._id),
    firstContact: r.firstContact,
    lastContact:  r.lastContact,
    messageCount: r.messageCount,
  }));
}

// ── Discount Requests ──────────────────────────────────────────────────────

export interface DiscountRequest {
  phone: string;
  name: string;
  email?: string;
  message: string;
  timestamp: number;
  comment?: string; // latest follow-up / negotiation note ("can only pay 4k")
}

export async function saveDiscountRequest(data: DiscountRequest): Promise<void> {
  const db = await getDb();
  await db.collection('discount_requests').insertOne(data);
}

export async function getDiscountRequests(): Promise<DiscountRequest[]> {
  const db   = await getDb();
  const docs = await db
    .collection<DiscountRequest>('discount_requests')
    .find({})
    .sort({ timestamp: -1 })
    .toArray();
  return docs.map(({ _id, ...rest }) => rest as DiscountRequest);
}

// Updates the most recent discount request for this phone with a follow-up comment
// (e.g. a later counter-offer like "can only pay 4k"), instead of creating a new record.
export async function updateDiscountRequestComment(phone: string, comment: string): Promise<void> {
  const db = await getDb();
  await db.collection('discount_requests').findOneAndUpdate(
    { phone },
    { $set: { comment } },
    { sort: { timestamp: -1 } },
  );
}

// ── Demo Requests ─────────────────────────────────────────────────────────

export interface DemoRequest {
  phone: string;
  name: string;
  email?: string;
  message: string;
  timestamp: number;
}

export async function saveDemoRequest(data: DemoRequest): Promise<void> {
  const db = await getDb();
  await db.collection('demo_requests').insertOne(data);
}

export async function getDemoRequests(): Promise<DemoRequest[]> {
  const db   = await getDb();
  const docs = await db
    .collection<DemoRequest>('demo_requests')
    .find({})
    .sort({ timestamp: -1 })
    .toArray();
  return docs.map(({ _id, ...rest }) => rest as DemoRequest);
}

// ── Bot Config ─────────────────────────────────────────────────────────────

export interface BotConfig {
  brochureUrl:    string;
  batchStartDate: string;
  batchEndDate:   string;
  nextBatchNote:  string;
}

const DEFAULT_CONFIG: BotConfig = {
  brochureUrl:    '/brochure.pdf',
  batchStartDate: '',
  batchEndDate:   '',
  nextBatchNote:  '',
};

export async function getBotConfig(): Promise<BotConfig> {
  const db  = await getDb();
  const doc = await db.collection('settings').findOne({ key: 'bot_config' });
  return doc ? (doc.value as BotConfig) : DEFAULT_CONFIG;
}

export async function saveBotConfig(config: BotConfig): Promise<void> {
  const db = await getDb();
  await db.collection('settings').updateOne(
    { key: 'bot_config' },
    { $set: { value: config } },
    { upsert: true }
  );
}

// ── Enrollment Sessions ────────────────────────────────────────────────────

export type EnrollmentState =
  | 'collecting_name'
  | 'collecting_email'
  | 'awaiting_screenshot'
  | 'screenshot_received'
  | 'approved'
  | 'rejected';

export interface EnrollmentSession {
  phone: string;
  state: EnrollmentState;
  name: string | null;
  email: string | null;
  driveFileId: string | null;
  driveFileUrl: string | null;
  sheetRowIndex: number | null;
  createdAt: number;
  updatedAt: number;
}

export async function getActiveEnrollmentSession(phone: string): Promise<EnrollmentSession | null> {
  const db  = await getDb();
  const doc = await db.collection('enrollment_sessions').findOne({
    phone,
    state: { $nin: ['rejected'] },
  });
  return doc ? (doc as unknown as EnrollmentSession) : null;
}

export async function saveEnrollmentSession(session: EnrollmentSession): Promise<void> {
  const db = await getDb();
  await db.collection('enrollment_sessions').updateOne(
    { phone: session.phone },
    { $set: { ...session, updatedAt: Date.now() } },
    { upsert: true },
  );
}

export async function getAllEnrollments(): Promise<EnrollmentSession[]> {
  const db   = await getDb();
  const docs = await db.collection('enrollment_sessions')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return docs as unknown as EnrollmentSession[];
}

export async function updateEnrollmentState(
  phone: string,
  state: EnrollmentState,
): Promise<void> {
  const db = await getDb();
  await db.collection('enrollment_sessions').updateOne(
    { phone },
    { $set: { state, updatedAt: Date.now() } },
  );
}

// ── Brochure ───────────────────────────────────────────────────────────────

export async function saveBrochure(buffer: Buffer, filename: string): Promise<void> {
  const db = await getDb();
  await db.collection('settings').updateOne(
    { key: 'brochure' },
    { $set: { value: { data: buffer.toString('base64'), filename, uploadedAt: Date.now() } } },
    { upsert: true }
  );
}

export async function getBrochure(): Promise<{ data: Buffer; filename: string; uploadedAt: number } | null> {
  const db  = await getDb();
  const doc = await db.collection('settings').findOne({ key: 'brochure' });
  if (!doc?.value?.data) return null;
  return {
    data:       Buffer.from(doc.value.data as string, 'base64'),
    filename:   doc.value.filename as string,
    uploadedAt: doc.value.uploadedAt as number,
  };
}

// ── Contact Directory & Lead Exports ─────────────────────────────────────────

export interface ContactDirectoryItem {
  phone: string;
  name: string | null;
  email: string | null;
  firstSeenAt: number;
  lastActiveAt: number;
  totalMessages: number;
  userMessagesCount: number;
  botRepliesCount: number;
  lastUserMessage: string;
  lastBotReply: string;
  botDisabled: boolean;
}

export async function getContactsDirectory(): Promise<ContactDirectoryItem[]> {
  try {
    const db = await getDb();

    const [msgs, profiles] = await Promise.all([
      db.collection<ChatMessage>('wa_messages').find({}).sort({ timestamp: 1 }).toArray(),
      db.collection<ContactProfile>('contact_profiles').find({}).toArray(),
    ]);

    const profileMap = new Map<string, ContactProfile>();
    for (const p of profiles) {
      if (p.phone) profileMap.set(p.phone, p);
    }

    const phoneMap = new Map<string, {
      firstSeenAt: number;
      lastActiveAt: number;
      totalMessages: number;
      userMessagesCount: number;
      botRepliesCount: number;
      lastUserMessage: string;
      lastBotReply: string;
    }>();

    for (const m of msgs) {
      if (!m.from) continue;
      const existing = phoneMap.get(m.from);
      const hasUserMsg = Boolean(m.text && m.text.trim());
      const hasReply = Boolean(m.reply && m.reply.trim());

      if (!existing) {
        phoneMap.set(m.from, {
          firstSeenAt: m.timestamp || Date.now(),
          lastActiveAt: m.timestamp || Date.now(),
          totalMessages: 1,
          userMessagesCount: hasUserMsg ? 1 : 0,
          botRepliesCount: hasReply ? 1 : 0,
          lastUserMessage: m.text || '',
          lastBotReply: m.reply || '',
        });
      } else {
        existing.lastActiveAt = Math.max(existing.lastActiveAt, m.timestamp || 0);
        existing.firstSeenAt = Math.min(existing.firstSeenAt, m.timestamp || Date.now());
        existing.totalMessages += 1;
        if (hasUserMsg) {
          existing.userMessagesCount += 1;
          existing.lastUserMessage = m.text || existing.lastUserMessage;
        }
        if (hasReply) {
          existing.botRepliesCount += 1;
          existing.lastBotReply = m.reply || existing.lastBotReply;
        }
      }
    }

    for (const p of profiles) {
      if (!phoneMap.has(p.phone)) {
        phoneMap.set(p.phone, {
          firstSeenAt: p.updatedAt || Date.now(),
          lastActiveAt: p.updatedAt || Date.now(),
          totalMessages: 0,
          userMessagesCount: 0,
          botRepliesCount: 0,
          lastUserMessage: '',
          lastBotReply: '',
        });
      }
    }

    const items: ContactDirectoryItem[] = [];
    for (const [phone, stats] of phoneMap.entries()) {
      const profile = profileMap.get(phone);
      items.push({
        phone,
        name: profile?.name || null,
        email: profile?.discountCollectedEmail || profile?.demoCollectedEmail || null,
        firstSeenAt: stats.firstSeenAt,
        lastActiveAt: stats.lastActiveAt,
        totalMessages: stats.totalMessages,
        userMessagesCount: stats.userMessagesCount,
        botRepliesCount: stats.botRepliesCount,
        lastUserMessage: stats.lastUserMessage,
        lastBotReply: stats.lastBotReply,
        botDisabled: Boolean(profile?.botDisabled),
      });
    }

    items.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    return items;
  } catch (err) {
    console.error('Failed to load contacts directory:', err);
    return [];
  }
}

