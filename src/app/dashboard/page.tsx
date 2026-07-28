import { getMessages } from '@/lib/redis';

export const dynamic = 'force-dynamic';

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('en-PK', {
    dateStyle: 'medium', timeStyle: 'short',
  });
}

function formatPhone(phone: string) {
  return `+${phone}`;
}

export default async function Dashboard() {
  const messages = await getMessages();

  return (
    <main style={{
      background: '#f2f1ee', minHeight: '100vh', padding: '40px 24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
    }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: '#2AAA8A',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🤖</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0a0a0a' }}>
              WhatsApp Conversations
            </h1>
            <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
              {messages.length} message{messages.length !== 1 ? 's' : ''} received
            </p>
          </div>
        </div>

        {/* Messages */}
        {messages.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 12, padding: '48px 24px',
            textAlign: 'center', color: '#aaa', fontSize: 14,
          }}>
            No messages yet. Once users message on WhatsApp, they'll appear here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 12,
                padding: '16px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                {/* Meta row */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: '#e8f8f4', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    }}>👤</div>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#0a0a0a' }}>
                      {formatPhone(msg.from)}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#bbb' }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {/* User message */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600,
                    color: '#888', marginBottom: 4, textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>User</div>
                  <div style={{
                    background: '#f9f9f9', borderRadius: 8, padding: '8px 12px',
                    fontSize: 13, color: '#333', lineHeight: 1.5,
                  }}>
                    {msg.text}
                  </div>
                </div>

                {/* Bot reply */}
                <div>
                  <div style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600,
                    color: '#2AAA8A', marginBottom: 4, textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>Bot</div>
                  <div style={{
                    background: '#f0faf7', borderRadius: 8, padding: '8px 12px',
                    fontSize: 13, color: '#333', lineHeight: 1.5,
                    borderLeft: '3px solid #2AAA8A',
                  }}>
                    {msg.reply}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
