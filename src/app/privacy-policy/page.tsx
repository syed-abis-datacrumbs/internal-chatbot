export const metadata = {
  title: 'Privacy Policy — DataCrumbs',
  description: 'Privacy Policy for DataCrumbs AI Assistant',
};

export default function PrivacyPolicy() {
  return (
    <main style={{
      background: '#f2f1ee', minHeight: '100vh',
      padding: '60px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
    }}>
      <div style={{
        maxWidth: 720, margin: '0 auto',
        background: '#fff', borderRadius: 16,
        padding: '48px 52px', boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
      }}>
        {/* Logo / Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#2AAA8A', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🤖</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#0a0a0a' }}>DataCrumbs</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0a0a0a', marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 40 }}>
          Last updated: June 22, 2026
        </p>

        <Section title="1. Introduction">
          DataCrumbs (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates an AI-powered chatbot assistant
          accessible via our website and WhatsApp. This Privacy Policy explains how we
          collect, use, and protect information when you interact with our chatbot.
        </Section>

        <Section title="2. Information We Collect">
          When you interact with the DataCrumbs AI Assistant, we may collect:
          <ul>
            <li>Messages and questions you send to the chatbot</li>
            <li>Your WhatsApp phone number (when using the WhatsApp channel)</li>
            <li>Timestamps of interactions</li>
          </ul>
          We do <strong>not</strong> collect passwords, payment details, or any sensitive
          personal identification beyond what is required to deliver chatbot responses.
        </Section>

        <Section title="3. How We Use Your Information">
          The information collected is used solely to:
          <ul>
            <li>Provide accurate, relevant responses to your questions about our bootcamp</li>
            <li>Improve the quality and accuracy of our AI assistant over time</li>
            <li>Send requested documents such as our course brochure</li>
          </ul>
          We do <strong>not</strong> sell, rent, or share your personal information with
          third parties for marketing purposes.
        </Section>

        <Section title="4. Data Retention">
          Conversation history within a session is held temporarily in memory and
          discarded after the session ends. We do not permanently store individual
          chat logs. Phone numbers used via WhatsApp are not stored in any database.
        </Section>

        <Section title="5. Third-Party Services">
          Our chatbot is powered by the following third-party services, each governed
          by their own privacy policies:
          <ul>
            <li><strong>Google Gemini API</strong> — AI language model (Google LLC)</li>
            <li><strong>Pinecone</strong> — Vector database for knowledge retrieval</li>
            <li><strong>Meta WhatsApp Cloud API</strong> — Message delivery via WhatsApp</li>
            <li><strong>Vercel</strong> — Hosting and infrastructure</li>
          </ul>
        </Section>

        <Section title="6. WhatsApp Messaging">
          By messaging us on WhatsApp, you consent to receiving automated responses
          from our AI assistant. You may opt out at any time by simply stopping
          communication. We comply with Meta&apos;s WhatsApp Business Policy.
        </Section>

        <Section title="7. Children's Privacy">
          Our services are not directed at individuals under the age of 13. We do not
          knowingly collect personal information from children.
        </Section>

        <Section title="8. Security">
          We implement industry-standard security measures to protect information
          transmitted through our chatbot. All communications are encrypted via HTTPS.
        </Section>

        <Section title="9. Your Rights">
          You have the right to:
          <ul>
            <li>Request information about what data we hold about you</li>
            <li>Request deletion of any personal data we may hold</li>
            <li>Opt out of chatbot interactions at any time</li>
          </ul>
        </Section>

        <Section title="10. Contact Us">
          If you have any questions about this Privacy Policy, please contact us:
          <br /><br />
          <strong>DataCrumbs</strong><br />
          Room #105, Shahrah-e-Faisal, Karachi, Pakistan<br />
          Email: <a href="mailto:info@datacrumbs.org" style={{ color: '#2AAA8A' }}>info@datacrumbs.org</a><br />
          Phone: +92 329 2020497
        </Section>

        <div style={{
          marginTop: 48, paddingTop: 24, borderTop: '1px solid #f0f0f0',
          fontSize: 12, color: '#aaa', textAlign: 'center',
        }}>
          © {new Date().getFullYear()} DataCrumbs. All rights reserved.
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', marginBottom: 10 }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: '#555', lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}
