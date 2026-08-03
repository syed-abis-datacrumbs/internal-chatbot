'use client';

import { useState } from 'react';
import { CORE_SYSTEM_PROMPT } from '@/lib/knowledge';

const NEON   = '#5ce46d';
const GLASS  = 'linear-gradient(180deg, rgba(20,29,25,0.8) 0%, rgba(13,20,17,0.9) 100%)';
const BORDER = '1px solid #202d26';

export default function PromptUI({ initialPrompt }: { initialPrompt: string }) {
  const [prompt,  setPrompt]  = useState(initialPrompt);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [focused, setFocused] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await fetch('/api/system-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault() {
    setPrompt(CORE_SYSTEM_PROMPT);
    setSaving(true);
    try {
      await fetch('/api/system-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: CORE_SYSTEM_PROMPT }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 820 }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>System Prompt</h1>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>
              The AI follows this instruction for every conversation. Changes take effect immediately on both website chat and WhatsApp.
            </p>
          </div>

          {/* Textarea card */}
          <div style={{ background: GLASS, border: BORDER, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              rows={22}
              style={{
                width: '100%', padding: '14px',
                fontSize: 13, lineHeight: 1.75,
                fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
                color: '#d1fae5',
                background: 'rgba(9,13,11,0.8)',
                border: `1.5px solid ${focused ? NEON : '#202d26'}`,
                borderRadius: 10,
                outline: 'none', resize: 'vertical',
                boxSizing: 'border-box',
                boxShadow: focused ? `0 0 0 3px rgba(92,228,109,0.1)` : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          </div>

          {/* Actions */}
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
              {saving ? 'Saving…' : 'Save Prompt'}
            </button>
            <button
              onClick={resetToDefault}
              disabled={saving}
              style={{
                padding: '10px 20px', borderRadius: 10,
                border: '1px solid #202d26',
                background: 'transparent',
                color: saving ? '#4b5563' : '#9ca3af',
                fontWeight: 600, fontSize: 13,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              Reset to Default
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: NEON, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>✓</span> Saved — bot is using the updated prompt.
              </span>
            )}
          </div>

          {/* Tip */}
          <div style={{
            background: 'rgba(92,228,109,0.05)',
            border: '1px solid rgba(92,228,109,0.15)',
            borderRadius: 10, padding: '12px 16px', marginTop: 20,
            fontSize: 12.5, color: '#9ca3af', lineHeight: 1.6,
          }}>
            <strong style={{ color: NEON }}>Tip:</strong> This is the complete system prompt the bot uses for every conversation — on WhatsApp and the website chat. Changes save instantly and take effect on the next message.
          </div>

        </div>
      </div>
    </div>
  );
}
