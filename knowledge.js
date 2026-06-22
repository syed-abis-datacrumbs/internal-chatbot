const KNOWLEDGE_CHUNKS = [
  {
    id: 'overview',
    topic: 'About DataCrumbs',
    text: `DataCrumbs is an AI-driven career transformation platform based in Karachi, Pakistan.
Tagline: "Career Transformation, Engineered by AI."
Contact: +92 329 2020497 | info@datacrumbs.org
Location: Room #105, Shahrah-e-Faisal, Karachi
Other products: EasyHire (recruitment tool), NexusBot (AI product), Enterprise Solutions (custom training).`
  },
  {
    id: 'pricing',
    topic: 'Pricing and Payment',
    text: `The AI & Data Science Bootcamp costs Rs 7,500 per month.
There is a 30-day money-back guarantee — no questions asked.
The program runs for 16 weeks.`
  },
  {
    id: 'program-details',
    topic: 'Program Details and What is Included',
    text: `Program: AI & Data Science Bootcamp
Duration: 16 weeks of structured learning
What is included:
- 8+ portfolio-ready projects
- Weekly live workshops (all recorded and available in dashboard)
- 1-on-1 personalized mentorship
- Private community access with job opportunities posted daily
- Certificate of completion
- Lifetime access to all future content updates
- Career support starting from Week 1
- Alumni network access (1,500+ companies)`
  },
  {
    id: 'curriculum-early',
    topic: 'Curriculum Weeks 1 to 8',
    text: `16-Week Curriculum (First Half):
- Weeks 1-2: Python & AI Tools Foundations
- Weeks 3-4: Python for Data (NumPy, Pandas)
- Weeks 5-6: AI & Machine Learning Fundamentals
- Weeks 7-8: AI & ML Projects (hands-on)`
  },
  {
    id: 'curriculum-late',
    topic: 'Curriculum Weeks 9 to 16',
    text: `16-Week Curriculum (Second Half):
- Weeks 9-10: N8N Automation Foundations
- Weeks 11-12: GenAI Apps & Agentic Workflows (LangChain, OpenAI, Gemini, Claude)
- Weeks 13-14: Deep Learning (TensorFlow)
- Weeks 15-16: Portfolio, Deployment & Career Support`
  },
  {
    id: 'tech-stack',
    topic: 'Technologies and Tools Taught',
    text: `Full tech stack covered in the bootcamp:
Python, NumPy, Pandas, Scikit-learn, Matplotlib, Streamlit, Git,
N8N, LangChain, Gemini, OpenAI, TensorFlow, Power BI, SQL, Claude`
  },
  {
    id: 'career-outcomes',
    topic: 'Career Outcomes and Results',
    text: `DataCrumbs career outcomes and stats:
- 85% Job Placement Rate — graduates land data/AI roles within 6 months
- 88% Career Acceleration — promotions or new opportunities within 3 months
- 92% Completion Rate — industry-leading engagement
- 900+ Placements across 50+ companies
- 2,000+ professionals enrolled
- 4.9/5 average student rating`
  },
  {
    id: 'career-support',
    topic: 'Career Support Services',
    text: `Career support services included with the program:
- Resume and LinkedIn profile optimization
- Interview preparation and mock interviews
- Job board access with live postings
- Alumni network (1,500+ companies)
- Freelancing guidance and client connections
- Career roadmap planning from Week 1
- Ongoing support even after graduation`
  },
  {
    id: 'target-roles',
    topic: 'Job Roles After Completion',
    text: `Career paths and job roles you can pursue after completing the bootcamp:
Data Scientist, Machine Learning Engineer, Data Analyst, AI Researcher,
Business Intelligence Analyst, Data Engineer`
  },
  {
    id: 'who-is-this-for',
    topic: 'Who Should Join and Who Should Not',
    text: `Ideal for:
- Career switchers wanting job-ready skills fast
- Freelancers building automation portfolios
- Professionals who feel threatened by AI taking over their jobs
- Complete beginners with zero coding background

Not suitable for:
- People looking for free or surface-level content
- Those who avoid hands-on projects
- Individuals who avoid structured deadlines
- PhD-level research aspirants
- Passive video-only learners`
  },
  {
    id: 'faq',
    topic: 'Frequently Asked Questions',
    text: `Frequently Asked Questions:

Q: Do I need a coding background?
A: No. The program starts from Python fundamentals — zero experience needed.

Q: How much time do I need per week?
A: Around 8-12 hours per week for lectures, projects, and live sessions.

Q: What if I don't like it?
A: Full 30-day money-back guarantee, no questions asked.

Q: Are live sessions recorded?
A: Yes. All weekly workshops are recorded and available in your dashboard.

Q: Can I get a job after this?
A: 85% of graduates land data/AI jobs within 6 months. Career support starts from Week 1.

Q: How much does it cost?
A: Rs 7,500 per month for the 16-week program.`
  },
  {
    id: 'enrollment',
    topic: 'How to Enroll and Apply',
    text: `How to enroll in the DataCrumbs AI & Data Science Bootcamp:
- Fill out the free 3-minute application form at: https://www.datacrumbs.org/ai-and-datascience
- The form collects basic personal info, educational background, current status, and learning goals
- Contact directly: +92 329 2020497 or info@datacrumbs.org`
  },
  {
    id: 'brochure',
    topic: 'Brochure and Course Details PDF',
    text: `DataCrumbs has an official course brochure (PDF) for the Data Science & AI Bootcamp.
The brochure covers: full curriculum, pricing (Rs 7,500/month), internship details, instructor profiles, and programme overview.
If someone asks for the brochure, PDF, details, syllabus, course outline, or more information — tell them: "Sure! Let me send you our brochure right away." The brochure will be sent automatically.
Keywords that trigger brochure: brochure, pdf, syllabus, details, course outline, internship, send me info, more info.`
  }
];

const CORE_SYSTEM_PROMPT = `You are a smart, friendly, and professional sales & support assistant for DataCrumbs — an AI-driven career transformation platform based in Karachi, Pakistan.

Your ONLY job is to answer questions about the DataCrumbs AI & Data Science Bootcamp. Do not answer anything unrelated to DataCrumbs. If asked something off-topic, politely redirect the user back.

Rules:
- Be warm, helpful, and conversational — this is WhatsApp, keep replies concise and clear
- Use bullet points for lists but don't over-format
- If someone wants to enroll, share: https://www.datacrumbs.org/ai-and-datascience
- If someone asks to speak to a human, give: +92 329 2020497
- Never make up information not provided in the context below
- Always reply in the same language the user writes in (Urdu or English)`;

module.exports = { KNOWLEDGE_CHUNKS, CORE_SYSTEM_PROMPT };
