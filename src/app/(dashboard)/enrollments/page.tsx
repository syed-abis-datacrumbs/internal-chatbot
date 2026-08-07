'use client';

import { useState, useEffect, useCallback } from 'react';
import DownloadCsvButton from '@/components/dashboard/DownloadCsvButton';

interface Enrollment {
  rowIndex: number;
  name: string;
  email: string;
  phone: string;
  submitted: string;
  driveLink: string;
  status: string;
}

const NEON   = '#5ce46d';
const GLASS  = 'linear-gradient(180deg, rgba(20,29,25,0.8) 0%, rgba(13,20,17,0.9) 100%)';
const BORDER = '1px solid #202d26';

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    'Pending':     { label: 'Pending Verification', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
    'Approved ✅': { label: 'Approved ✅', color: NEON, bg: 'rgba(92,228,109,0.1)' },
    'Rejected ❌': { label: 'Rejected ❌', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
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
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '32px 36px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Enrollments</h1>
              {pending > 0 && (
                <span style={{
                  background: 'rgba(251,146,60,0.15)',
                  border: '1px solid rgba(251,146,60,0.4)',
                  color: '#fb923c', borderRadius: 20,
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
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            {enrollments.length} total enrollment{enrollments.length !== 1 ? 's' : ''} collected via WhatsApp
          </p>
        </div>

        {loading ? (
          <div style={{ color: '#6b7280', fontSize: 14, paddingTop: 48, textAlign: 'center' }}>
            Loading…
          </div>
        ) : enrollments.length === 0 ? (
          <div style={{
            background: GLASS, border: BORDER, borderRadius: 16,
            padding: '48px 24px', textAlign: 'center',
            color: '#6b7280', fontSize: 14,
          }}>
            No enrollments yet. They'll appear here when students express interest on WhatsApp.
          </div>
        ) : (
          <div style={{ background: GLASS, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>

            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 130px 130px 120px 160px 140px',
              padding: '12px 20px',
              background: 'rgba(13,20,17,0.6)',
              borderBottom: '1px solid #1a251f',
              fontSize: 11, fontWeight: 600, color: '#6b7280',
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
                  borderBottom: i < enrollments.length - 1 ? '1px solid #1a251f' : 'none',
                  alignItems: 'center', fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                  {e.name || <span style={{ color: '#4b5563' }}>—</span>}
                </div>

                <div style={{ color: '#9ca3af', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                  {e.email || <span style={{ color: '#4b5563' }}>—</span>}
                </div>

                <div style={{ color: '#9ca3af', fontSize: 12 }}>+{e.phone}</div>

                <div style={{ color: '#6b7280', fontSize: 11 }}>{e.submitted}</div>

                <div>
                  {e.driveLink ? (
                    <a
                      href={e.driveLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: NEON, fontWeight: 500, textDecoration: 'none' }}
                    >
                      View ↗
                    </a>
                  ) : (
                    <span style={{ color: '#4b5563', fontSize: 12 }}>—</span>
                  )}
                </div>

                <div>{statusBadge(e.status)}</div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {e.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => act(e.phone, 'approved')}
                        disabled={!!acting}
                        style={{
                          padding: '5px 12px', borderRadius: 6, border: `1px solid ${NEON}`,
                          background: 'transparent', color: NEON,
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
                          padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.4)',
                          background: 'transparent', color: '#f87171',
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
