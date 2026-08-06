'use client';

import { DiscountRequest } from '@/lib/redis';

const NEON   = '#5ce46d';
const GLASS  = 'linear-gradient(180deg, rgba(20,29,25,0.8) 0%, rgba(13,20,17,0.9) 100%)';
const BORDER = '#202d26';

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('en-PK', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Karachi',
  });
}

export default function DiscountsUI({ requests }: { requests: DiscountRequest[] }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 860 }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>
              Discount Requests
            </h1>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
              Students who asked for financial support or a discount — {requests.length} request{requests.length !== 1 ? 's' : ''}
            </p>
          </div>

          {requests.length === 0 ? (
            <div style={{
              background: GLASS, border: `1px solid ${BORDER}`,
              borderRadius: 16, padding: 48,
              textAlign: 'center', color: '#6b7280', fontSize: 14,
            }}>
              No discount requests yet.
            </div>
          ) : (
            <div style={{
              background: GLASS, border: `1px solid ${BORDER}`,
              borderRadius: 16, overflow: 'hidden',
            }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '140px 160px 120px 1fr 150px',
                padding: '12px 20px',
                borderBottom: `1px solid ${BORDER}`,
                fontSize: 11, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <span>Name</span>
                <span>Email</span>
                <span>Phone</span>
                <span>Message</span>
                <span>Date &amp; Time</span>
              </div>

              {requests.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 160px 120px 1fr 150px',
                    padding: '14px 20px',
                    borderBottom: i < requests.length - 1 ? `1px solid ${BORDER}` : 'none',
                    alignItems: 'start',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0e1a13')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>
                    {r.name || '—'}
                  </span>
                  <span style={{ fontSize: 12, color: '#9ca3af', wordBreak: 'break-all' }}>
                    {r.email || '—'}
                  </span>
                  <span style={{ fontSize: 12, color: NEON, fontFamily: 'monospace' }}>
                    +{r.phone}
                  </span>
                  <span style={{
                    fontSize: 12.5, color: '#d1d5db', lineHeight: 1.55,
                    paddingRight: 16,
                  }}>
                    {r.message}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#6b7280' }}>
                    {formatTime(r.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
