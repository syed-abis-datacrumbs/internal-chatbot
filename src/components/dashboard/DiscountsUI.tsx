'use client';

import { useState } from 'react';
import { SheetDiscountRequest } from '@/lib/google';
import DownloadCsvButton from './DownloadCsvButton';
import { useTheme } from '@/context/ThemeContext';

export default function DiscountsUI({ requests }: { requests: SheetDiscountRequest[] }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [search, setSearch] = useState('');

  const neonColor = isLight ? '#16a34a' : '#5ce46d';
  const headerColor = isLight ? '#0f172a' : '#ffffff';
  const subheaderColor = isLight ? '#64748b' : '#9ca3af';
  const cardBg = isLight ? '#ffffff' : 'linear-gradient(180deg, rgba(20,29,25,0.8) 0%, rgba(13,20,17,0.9) 100%)';
  const cardBorder = isLight ? '1px solid #e2e8f0' : '1px solid #202d26';
  const tableHeaderBg = isLight ? '#f1f5f9' : 'rgba(13,20,17,0.6)';
  const rowDivider = isLight ? '#e2e8f0' : '#202d26';
  const searchBg = isLight ? '#ffffff' : '#0d1511';
  const searchBorder = isLight ? '1px solid #cbd5e1' : '1px solid #202d26';
  const searchColor = isLight ? '#0f172a' : '#e5e7eb';

  const filtered = search.trim()
    ? requests.filter(r => {
        const q = search.trim().toLowerCase();
        return (
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.email && r.email.toLowerCase().includes(q)) ||
          r.phone.includes(q.replace(/\D/g, '')) ||
          r.message.toLowerCase().includes(q)
        );
      })
    : requests;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: isLight ? '#f8fafc' : 'transparent', transition: 'background-color 0.2s ease' }}>
      <div style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 860 }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: headerColor, margin: 0 }}>
                Discount Requests
              </h1>
              <DownloadCsvButton
                filename="discount-requests.csv"
                headers={['Name', 'Email', 'Phone', 'Message', 'Submitted', 'Comment']}
                rows={requests.map(r => [r.name, r.email ?? '', `+${r.phone}`, r.message, r.submitted, r.comment ?? ''])}
              />
            </div>
            <p style={{ fontSize: 13, color: subheaderColor, marginTop: 4, marginBottom: 14 }}>
              Students who asked for financial support or a discount — {requests.length} request{requests.length !== 1 ? 's' : ''}
            </p>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or message…"
              style={{
                width: '100%', maxWidth: 400, boxSizing: 'border-box',
                background: searchBg, border: searchBorder,
                borderRadius: 8, padding: '8px 12px', fontSize: 13,
                color: searchColor, outline: 'none',
                boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              }}
            />
          </div>

          {filtered.length === 0 ? (
            <div style={{
              background: cardBg, border: cardBorder,
              borderRadius: 16, padding: 48,
              textAlign: 'center', color: '#6b7280', fontSize: 14,
              boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            }}>
              {search.trim() ? 'No matching discount requests.' : 'No discount requests yet.'}
            </div>
          ) : (
            <div style={{
              background: cardBg, border: cardBorder,
              borderRadius: 16, overflow: 'hidden',
              boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.05)' : 'none',
            }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '140px 160px 120px 1fr 150px',
                padding: '12px 20px',
                background: tableHeaderBg,
                borderBottom: `1px solid ${rowDivider}`,
                fontSize: 11, fontWeight: 700, color: isLight ? '#475569' : '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <span>Name</span>
                <span>Email</span>
                <span>Phone</span>
                <span>Message</span>
                <span>Date &amp; Time</span>
              </div>

              {filtered.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 160px 120px 1fr 150px',
                    padding: '14px 20px',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${rowDivider}` : 'none',
                    alignItems: 'start',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = isLight ? '#f1f5f9' : '#0e1a13')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: isLight ? '#0f172a' : '#e5e7eb' }}>
                    {r.name || '—'}
                  </span>
                  <span style={{ fontSize: 12, color: subheaderColor, wordBreak: 'break-all' }}>
                    {r.email || '—'}
                  </span>
                  <span style={{ fontSize: 12, color: neonColor, fontFamily: 'monospace' }}>
                    +{r.phone}
                  </span>
                  <span style={{
                    fontSize: 12.5, color: isLight ? '#334155' : '#d1d5db', lineHeight: 1.55,
                    paddingRight: 16,
                  }}>
                    {r.message}
                  </span>
                  <span style={{ fontSize: 11.5, color: isLight ? '#94a3b8' : '#6b7280' }}>
                    {r.submitted}
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
