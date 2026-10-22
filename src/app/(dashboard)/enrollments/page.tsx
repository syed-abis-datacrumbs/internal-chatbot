'use client';

import { useState, useEffect, useCallback } from 'react';
import DownloadCsvButton from '@/components/dashboard/DownloadCsvButton';
import { useTheme } from '@/context/ThemeContext';

interface Enrollment {
  rowIndex: number;
  name: string;
  email: string;
  phone: string;
  submitted: string;
  driveLink: string;
  status: string;
}

function StatusBadge({ status, isLight }: { status: string; isLight: boolean }) {
  const neon = isLight ? '#16a34a' : '#5ce46d';
  const map: Record<string, { label: string; color: string; bg: string }> = {
    'Pending':     { label: 'Pending Verification', color: isLight ? '#d97706' : '#fb923c', bg: isLight ? 'rgba(217,119,6,0.1)' : 'rgba(251,146,60,0.1)' },
    'Approved ✅': { label: 'Approved ✅', color: neon, bg: isLight ? 'rgba(22,163,74,0.1)' : 'rgba(92,228,109,0.1)' },
    'Rejected ❌': { label: 'Rejected ❌', color: isLight ? '#dc2626' : '#f87171', bg: isLight ? 'rgba(220,38,38,0.1)' : 'rgba(248,113,113,0.1)' },
  };
  const s = map[status] ?? map['Pending'];
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      color: s.color, background: s.bg,
      border: `1px solid ${s.color}44`,
    }}>
      {s.label}
    </span>
  );
}

export default function EnrollmentsPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const neonColor = isLight ? '#16a34a' : '#5ce46d';
  const headerColor = isLight ? '#0f172a' : '#ffffff';
  const subheaderColor = isLight ? '#64748b' : '#9ca3af';
  const cardBg = isLight ? '#ffffff' : 'linear-gradient(180deg, rgba(20,29,25,0.8) 0%, rgba(13,20,17,0.9) 100%)';
  const cardBorder = isLight ? '1px solid #e2e8f0' : '1px solid #202d26';
  const tableHeaderBg = isLight ? '#f1f5f9' : 'rgba(13,20,17,0.6)';
  const rowDivider = isLight ? '#e2e8f0' : '#1a251f';

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [acting, setActing]           = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/enrollments');
      const data = await res.json() as { enrollments: Enrollment[] };
      setEnrollments(data.enrollments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(phone: string, status: 'approved' | 'rejected') {
    setActing(phone + status);
    try {
      await fetch(`/api/enrollments/${encodeURIComponent(phone)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setActing(null);
    }
  }

  const pending = enrollments.filter(e => e.status === 'Pending').length;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: isLight ? '#f8fafc' : 'transparent', transition: 'background-color 0.2s ease' }}>
      <div style={{ padding: '32px 36px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: headerColor, margin: 0 }}>Enrollments</h1>
              {pending > 0 && (
                <span style={{
                  background: isLight ? 'rgba(217,119,6,0.12)' : 'rgba(251,146,60,0.15)',
                  border: `1px solid ${isLight ? 'rgba(217,119,6,0.35)' : 'rgba(251,146,60,0.4)'}`,
                  color: isLight ? '#b45309' : '#fb923c', borderRadius: 20,
                  fontSize: 12, fontWeight: 700, padding: '2px 10px',
                }}>
                  {pending} pending verification
                </span>
              )}
            </div>
            <DownloadCsvButton
              filename="enrollments.csv"
              headers={['Name', 'Email', 'Phone', 'Submitted', 'Status', 'Screenshot']}
              rows={enrollments.map(e => [e.name ?? '', e.email ?? '', `+${e.phone}`, e.submitted, e.status, e.driveLink ?? ''])}
            />
          </div>
          <p style={{ fontSize: 13, color: subheaderColor, marginTop: 4 }}>
            {enrollments.length} total enrollment{enrollments.length !== 1 ? 's' : ''} collected via WhatsApp
          </p>
        </div>

        {loading ? (
          <div style={{ color: '#6b7280', fontSize: 14, paddingTop: 48, textAlign: 'center' }}>
            Loading…
          </div>
        ) : enrollments.length === 0 ? (
          <div style={{
            background: cardBg, border: cardBorder, borderRadius: 16,
            padding: '48px 24px', textAlign: 'center',
            color: '#6b7280', fontSize: 14,
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
          }}>
            No enrollments yet. They'll appear here when students express interest on WhatsApp.
          </div>
        ) : (
          <div style={{
            background: cardBg, border: cardBorder, borderRadius: 16, overflow: 'hidden',
            boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.05)' : 'none',
          }}>

            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 130px 130px 120px 160px 140px',
              padding: '12px 20px',
              background: tableHeaderBg,
              borderBottom: `1px solid ${rowDivider}`,
              fontSize: 11, fontWeight: 600, color: isLight ? '#475569' : '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              <div>Name</div>
              <div>Email</div>
              <div>Phone</div>
              <div>Submitted</div>
              <div>Screenshot</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {enrollments.map((e, i) => (
              <div
                key={e.phone}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 130px 130px 120px 160px 140px',
                  padding: '14px 20px',
                  borderBottom: i < enrollments.length - 1 ? `1px solid ${rowDivider}` : 'none',
                  alignItems: 'center', fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, color: isLight ? '#0f172a' : '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                  {e.name || <span style={{ color: '#94a3b8' }}>—</span>}
                </div>

                <div style={{ color: subheaderColor, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                  {e.email || <span style={{ color: '#94a3b8' }}>—</span>}
                </div>

                <div style={{ color: subheaderColor, fontSize: 12 }}>+{e.phone}</div>

                <div style={{ color: isLight ? '#94a3b8' : '#6b7280', fontSize: 11 }}>{e.submitted}</div>

                <div>
                  {e.driveLink ? (
                    <a
                      href={e.driveLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: neonColor, fontWeight: 500, textDecoration: 'none' }}
                    >
                      View ↗
                    </a>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                  )}
                </div>

                <div><StatusBadge status={e.status} isLight={isLight} /></div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {e.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => act(e.phone, 'approved')}
                        disabled={!!acting}
                        style={{
                          padding: '5px 12px', borderRadius: 6,
                          border: `1px solid ${neonColor}`,
                          background: isLight ? 'rgba(22,163,74,0.06)' : 'transparent',
                          color: neonColor,
                          fontSize: 11, fontWeight: 600, cursor: acting ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', opacity: acting ? 0.5 : 1,
                        }}
                      >
                        {acting === e.phone + 'approved' ? '…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => act(e.phone, 'rejected')}
                        disabled={!!acting}
                        style={{
                          padding: '5px 12px', borderRadius: 6,
                          border: `1px solid ${isLight ? 'rgba(220,38,38,0.3)' : 'rgba(248,113,113,0.4)'}`,
                          background: isLight ? 'rgba(220,38,38,0.06)' : 'transparent',
                          color: isLight ? '#dc2626' : '#f87171',
                          fontSize: 11, fontWeight: 600, cursor: acting ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', opacity: acting ? 0.5 : 1,
                        }}
                      >
                        {acting === e.phone + 'rejected' ? '…' : 'Reject'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

