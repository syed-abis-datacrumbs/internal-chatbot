'use client';

import { useState, useRef } from 'react';
import { BotConfig } from '@/lib/redis';

const NEON   = '#5ce46d';
const GLASS  = 'linear-gradient(180deg, rgba(20,29,25,0.8) 0%, rgba(13,20,17,0.9) 100%)';
const BORDER = '#202d26';

function Label({ text, sub }: { text: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db' }}>{text}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const inputStyle = (focused: boolean): React.CSSProperties => ({
  width: '100%', height: 42, padding: '0 14px',
  border: `1.5px solid ${focused ? NEON : BORDER}`,
  borderRadius: 8, fontSize: 13.5,
  color: '#e5e7eb', background: 'rgba(9,13,11,0.7)',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  boxShadow: focused ? '0 0 0 3px rgba(92,228,109,0.1)' : 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
});

export default function ConfigUI({
  initial,
  currentBrochure,
}: {
  initial: BotConfig;
  currentBrochure: { filename: string; uploadedAt: number } | null;
}) {
  const [cfg,         setCfg]         = useState<BotConfig>(initial);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmAll,  setConfirmAll]  = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(currentBrochure?.filename ?? null);
  const [uploadedAt,  setUploadedAt]  = useState<number | null>(currentBrochure?.uploadedAt ?? null);
  const [uploadError, setUploadError] = useState('');

  const [f1, setF1] = useState(false);
  const [f2, setF2] = useState(false);
  const [f3, setF3] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(key: keyof BotConfig, val: string) {
    setCfg(prev => ({ ...prev, [key]: val }));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleBrochureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/brochure', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json();
        setUploadError(err.error || 'Upload failed');
        return;
      }
      setUploadedName(file.name);
      setUploadedAt(Date.now());
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 640 }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Configuration</h1>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
              Manage brochure, batch dates, and bot settings.
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: GLASS, border: `1px solid ${BORDER}`,
            borderRadius: 16, padding: 28,
            display: 'flex', flexDirection: 'column', gap: 24,
          }}>

            {/* Brochure */}
            <div>
              <Label
                text="Brochure PDF"
                sub="Uploaded PDF will be sent automatically to students who ask for it."
              />

              {uploadedName ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(92,228,109,0.05)',
                  border: '1px solid rgba(92,228,109,0.2)',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 10,
                }}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: '#e5e7eb',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {uploadedName}
                    </div>
                    {uploadedAt && (
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                        Uploaded {new Date(uploadedAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                  <a
                    href="/api/brochure"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: NEON, fontWeight: 500, textDecoration: 'none', flexShrink: 0 }}
                  >
                    Preview ↗
                  </a>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(13,20,17,0.5)', border: `1.5px dashed ${BORDER}`,
                  borderRadius: 10, padding: 16, textAlign: 'center',
                  fontSize: 13, color: '#6b7280', marginBottom: 10,
                }}>
                  No brochure uploaded yet
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleBrochureUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    padding: '9px 20px', borderRadius: 8,
                    border: `1.5px solid ${NEON}`,
                    background: uploading ? 'rgba(92,228,109,0.05)' : 'transparent',
                    color: NEON, fontWeight: 600, fontSize: 13,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.15s',
                  }}
                >
                  {uploading ? (
                    <>
                      <div style={{
                        width: 12, height: 12,
                        border: `2px solid rgba(92,228,109,0.2)`,
                        borderTop: `2px solid ${NEON}`,
                        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                      }} />
                      Uploading…
                    </>
                  ) : (
                    <>{uploadedName ? '📤 Replace Brochure' : '📤 Upload Brochure'}</>
                  )}
                </button>
                <span style={{ fontSize: 11, color: '#6b7280' }}>PDF only · max 10 MB</span>
              </div>

              {uploadError && (
                <div style={{
                  background: 'rgba(220,38,38,0.1)',
                  border: '1px solid rgba(220,38,38,0.3)',
                  borderRadius: 8, padding: '8px 12px',
                  fontSize: 12.5, color: '#f87171', marginTop: 8,
                }}>
                  {uploadError}
                </div>
              )}
            </div>

            <div style={{ height: 1, background: '#1a251f' }} />

            {/* Batch dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Label text="Batch Start Date" />
                <input
                  type="date"
                  value={cfg.batchStartDate}
                  onChange={e => update('batchStartDate', e.target.value)}
                  onFocus={() => setF1(true)}
                  onBlur={() => setF1(false)}
                  style={inputStyle(f1)}
                />
              </div>
              <div>
                <Label text="Batch End Date" />
                <input
                  type="date"
                  value={cfg.batchEndDate}
                  onChange={e => update('batchEndDate', e.target.value)}
                  onFocus={() => setF2(true)}
                  onBlur={() => setF2(false)}
                  style={inputStyle(f2)}
                />
              </div>
            </div>

            {/* Next batch note */}
            <div>
              <Label
                text="Next Batch Note"
                sub="Shown to students asking about upcoming batches."
              />
              <textarea
                value={cfg.nextBatchNote}
                onChange={e => update('nextBatchNote', e.target.value)}
                onFocus={() => setF3(true)}
                onBlur={() => setF3(false)}
                rows={3}
                placeholder="Next batch starts August 1st — only 20 seats remaining!"
                style={{
                  ...inputStyle(f3),
                  height: 'auto', padding: '10px 14px',
                  resize: 'vertical', lineHeight: 1.55,
                }}
              />
            </div>

            <div style={{ height: 1, background: '#1a251f' }} />

            {/* Save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  padding: '10px 28px', borderRadius: 10, border: 'none',
                  background: saving ? '#1a251f' : NEON,
                  color: saving ? '#6b7280' : '#000',
                  fontWeight: 700, fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: saving ? 'none' : '0 0 18px rgba(92,228,109,0.4)',
                  transition: 'all 0.15s',
                }}
              >
                {saving ? 'Saving…' : 'Save Configuration'}
              </button>
              {saved && (
                <span style={{ fontSize: 13, color: NEON, fontWeight: 500 }}>
                  ✓ Configuration saved.
                </span>
              )}
            </div>

          </div>

          {/* Danger zone */}
          <div style={{
            marginTop: 24,
            background: 'rgba(220,38,38,0.05)',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 16, padding: 28,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>Danger Zone</div>
            <div style={{ fontSize: 12.5, color: '#9ca3af', marginBottom: 18 }}>
              These actions are permanent and cannot be undone.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {!confirmAll ? (
                <button
                  onClick={() => setConfirmAll(true)}
                  style={{
                    padding: '9px 22px', borderRadius: 8,
                    border: '1.5px solid rgba(220,38,38,0.5)',
                    background: 'transparent', color: '#f87171',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  🗑 Delete All Chats
                </button>
              ) : (
                <>
                  <span style={{ fontSize: 13, color: '#fca5a5' }}>Are you sure? This deletes every conversation.</span>
                  <button
                    onClick={async () => {
                      setDeletingAll(true);
                      try {
                        await fetch('/api/messages', { method: 'DELETE' });
                        setConfirmAll(false);
                        window.location.reload();
                      } finally {
                        setDeletingAll(false);
                      }
                    }}
                    disabled={deletingAll}
                    style={{
                      padding: '8px 18px', borderRadius: 8, border: 'none',
                      background: '#dc2626', color: '#fff',
                      fontWeight: 700, fontSize: 13, cursor: deletingAll ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {deletingAll ? 'Deleting…' : 'Yes, Delete All'}
                  </button>
                  <button
                    onClick={() => setConfirmAll(false)}
                    style={{
                      padding: '8px 14px', borderRadius: 8,
                      border: `1px solid ${BORDER}`,
                      background: 'transparent', color: '#9ca3af',
                      fontWeight: 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
