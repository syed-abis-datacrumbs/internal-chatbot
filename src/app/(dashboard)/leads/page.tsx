import { getLeads } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const NEON   = '#5ce46d';
const GLASS  = 'linear-gradient(180deg, rgba(20,29,25,0.8) 0%, rgba(13,20,17,0.9) 100%)';
const BORDER = '1px solid #202d26';

function fmt(ts: number) {
  return new Date(ts).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '32px 36px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Leads</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            {leads.length} unique contact{leads.length !== 1 ? 's' : ''} who have messaged on WhatsApp
          </p>
        </div>

        {leads.length === 0 ? (
          <div style={{
            background: GLASS, border: BORDER,
            borderRadius: 16, padding: '48px 24px',
            textAlign: 'center', color: '#6b7280', fontSize: 14,
          }}>
            No leads yet. They&apos;ll appear here once people message on WhatsApp.
          </div>
        ) : (
          <div style={{ background: GLASS, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 1fr 1fr 90px',
              padding: '12px 20px',
              background: 'rgba(13,20,17,0.6)',
              borderBottom: '1px solid #1a251f',
              fontSize: 11, fontWeight: 600, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              <div>#</div>
              <div>Phone Number</div>
              <div>First Contact</div>
              <div>Last Contact</div>
              <div style={{ textAlign: 'center' }}>Messages</div>
            </div>

            <style>{`.lead-row:hover { background: rgba(92,228,109,0.04) !important; }`}</style>
            {leads.map((lead, i) => (
              <div
                key={lead.phone}
                className="lead-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 1fr 1fr 90px',
                  padding: '14px 20px',
                  borderBottom: i < leads.length - 1 ? '1px solid #1a251f' : 'none',
                  alignItems: 'center', fontSize: 13,
                  transition: 'background 0.12s',
                }}
              >
                <div style={{ color: '#4b5563', fontWeight: 500 }}>{i + 1}</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(92,228,109,0.08)',
                    border: '1.5px solid rgba(92,228,109,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, color: NEON,
                  }}>👤</div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#e5e7eb' }}>+{lead.phone}</div>
                    <a
                      href={`https://wa.me/${lead.phone}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, color: NEON, textDecoration: 'none', fontWeight: 500 }}
                    >
                      Open in WhatsApp ↗
                    </a>
                  </div>
                </div>

                <div style={{ color: '#9ca3af', fontSize: 12 }}>{fmt(lead.firstContact)}</div>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>{fmt(lead.lastContact)}</div>

                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    background: 'rgba(92,228,109,0.12)',
                    border: '1px solid rgba(92,228,109,0.3)',
                    color: NEON,
                    borderRadius: 20, padding: '3px 12px',
                    fontSize: 12, fontWeight: 600,
                    boxShadow: '0 0 8px rgba(92,228,109,0.1)',
                  }}>
                    {lead.messageCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
