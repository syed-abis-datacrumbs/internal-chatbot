'use client';

import { useState } from 'react';
import { SheetLead } from '@/lib/google';
import DownloadCsvButton from './DownloadCsvButton';

const NEON   = '#5ce46d';
const GLASS  = 'linear-gradient(180deg, rgba(20,29,25,0.8) 0%, rgba(13,20,17,0.9) 100%)';
const BORDER = '1px solid #202d26';

export default function LeadsUI({ leads }: { leads: SheetLead[] }) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? leads.filter(l => {
        const q = search.trim().toLowerCase();
        return (
          (l.name && l.name.toLowerCase().includes(q)) ||
          l.phone.includes(q.replace(/\D/g, ''))
        );
      })
    : leads;

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '32px 36px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Leads</h1>
            <DownloadCsvButton
              filename="leads.csv"
              headers={['Name', 'Email', 'Phone', 'Date', 'Time', 'Status']}
              rows={leads.map(l => [l.name ?? '', l.email ?? '', `+${l.phone}`, l.date, l.time, l.status ?? ''])}
            />
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, marginBottom: 14 }}>
            {leads.length} unique contact{leads.length !== 1 ? 's' : ''} who have messaged on WhatsApp
          </p>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone number…"
            style={{
              width: '100%', maxWidth: 400, boxSizing: 'border-box',
              background: '#0d1511', border: '1px solid #202d26',
              borderRadius: 8, padding: '8px 12px', fontSize: 13,
              color: '#e5e7eb', outline: 'none',
            }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{
            background: GLASS, border: BORDER,
            borderRadius: 16, padding: '48px 24px',
            textAlign: 'center', color: '#6b7280', fontSize: 14,
          }}>
            {search.trim() ? 'No matching leads.' : "No leads yet. They'll appear here once people message on WhatsApp."}
          </div>
        ) : (
          <div style={{ background: GLASS, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 160px 110px 100px 110px',
              padding: '12px 20px',
              background: 'rgba(13,20,17,0.6)',
              borderBottom: '1px solid #1a251f',
              fontSize: 11, fontWeight: 600, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              <div>#</div>
              <div>Phone Number</div>
              <div>Email</div>
              <div>Date</div>
              <div>Time</div>
              <div>Status</div>
            </div>

            <style>{`.lead-row:hover { background: rgba(92,228,109,0.04) !important; }`}</style>
            {filtered.map((lead, i) => (
              <div
                key={`${lead.phone}-${i}`}
                className="lead-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 160px 110px 100px 110px',
                  padding: '14px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #1a251f' : 'none',
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
                    {lead.name && (
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 13, marginBottom: 1 }}>
                        {lead.name}
                      </div>
                    )}
                    <div style={{ fontWeight: lead.name ? 400 : 600, color: lead.name ? '#9ca3af' : '#e5e7eb', fontSize: lead.name ? 11 : 13 }}>
                      +{lead.phone}
                    </div>
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

                <div style={{ color: '#9ca3af', fontSize: 12, wordBreak: 'break-all', paddingRight: 8 }}>{lead.email || '—'}</div>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>{lead.date}</div>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>{lead.time}</div>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>{lead.status || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
