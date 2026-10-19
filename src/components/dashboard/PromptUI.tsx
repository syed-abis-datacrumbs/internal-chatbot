'use client';

import { useState } from 'react';

const NEON   = '#5ce46d';
const GLASS  = 'linear-gradient(180deg, rgba(20,29,25,0.85) 0%, rgba(13,20,17,0.95) 100%)';
const BORDER = '1px solid #202d26';

interface PromptUIProps {
  initialPrompt: string;
  defaultPrompt: string;
  isInitiallyCustom?: boolean;
}

export default function PromptUI({ initialPrompt, defaultPrompt, isInitiallyCustom = false }: PromptUIProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isCustom, setIsCustom] = useState(isInitiallyCustom);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/system-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error('Failed to save prompt');
      setIsCustom(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving prompt');
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault() {
    if (saving) return;
    if (!window.confirm('Are you sure you want to reset to the dynamic default prompt from the internship portal?')) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/system-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      const freshPrompt = data.prompt || defaultPrompt;
      setPrompt(freshPrompt);
      setIsCustom(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error resetting prompt');
    } finally {
      setSaving(false);
    }
  }

  const charCount = prompt.length;
  const lineCount = prompt.split('\n').length;

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 900 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>System Prompt</h1>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: isCustom ? 'rgba(92,228,109,0.12)' : 'rgba(59,130,246,0.15)',
                  color: isCustom ? NEON : '#60a5fa',
                  border: `1px solid ${isCustom ? 'rgba(92,228,109,0.3)' : 'rgba(59,130,246,0.3)'}`,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isCustom ? NEON : '#60a5fa' }} />
                  {isCustom ? 'Custom Saved Prompt' : 'Dynamic Live Default'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8, lineHeight: 1.5, margin: 0 }}>
                Manage the core AI persona, guidelines, and tone. Edits save to MongoDB and take effect immediately on WhatsApp and website chat.
              </p>
            </div>

            {/* Quick stats */}
            <div style={{
              display: 'flex', gap: 16, background: 'rgba(20,29,25,0.6)', border: BORDER,
              borderRadius: 10, padding: '8px 16px', flexShrink: 0,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lines</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{lineCount}</div>
              </div>
              <div style={{ width: 1, background: '#202d26' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Characters</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{charCount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Textarea Card */}
          <div style={{
            background: GLASS, border: BORDER, borderRadius: 16, padding: 18, marginBottom: 18,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              rows={22}
              style={{
                width: '100%', padding: '14px',
                fontSize: 13, lineHeight: 1.7,
                fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
                color: '#d1fae5',
                background: 'rgba(9,13,11,0.9)',
                border: `1.5px solid ${focused ? NEON : '#202d26'}`,
                borderRadius: 10,
                outline: 'none', resize: 'vertical',
                boxSizing: 'border-box',
                boxShadow: focused ? `0 0 0 3px rgba(92,228,109,0.12)` : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  padding: '11px 28px', borderRadius: 10, border: 'none',
                  background: saving ? '#1a251f' : NEON,
                  color: saving ? '#6b7280' : '#000',
                  fontWeight: 700, fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: saving ? 'none' : '0 0 20px rgba(92,228,109,0.35)',
                  transition: 'all 0.15s',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>

              <button
                onClick={resetToDefault}
                disabled={saving}
                style={{
                  padding: '11px 20px', borderRadius: 10,
                  border: '1px solid #202d26',
                  background: 'transparent',
                  color: saving ? '#4b5563' : '#9ca3af',
                  fontWeight: 600, fontSize: 13,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#374151'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#202d26'; (e.currentTarget as HTMLElement).style.color = '#9ca3af'; }}
              >
                Reset to Live Default
              </button>

              {saved && (
                <span style={{ fontSize: 13, color: NEON, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>✓</span> Saved! Live bot is now using your updated prompt.
                </span>
              )}

              {error && (
                <span style={{ fontSize: 13, color: '#f87171', fontWeight: 500 }}>
                  ✕ {error}
                </span>
              )}
            </div>
          </div>

          {/* Explanation Tip */}
          <div style={{
            background: 'rgba(92,228,109,0.04)',
            border: '1px solid rgba(92,228,109,0.18)',
            borderRadius: 12, padding: '16px 20px', marginTop: 24,
            fontSize: 12.5, color: '#9ca3af', lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 600, color: NEON, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              💡 How Prompt Customization Works
            </div>
            When you save custom instructions here, the bot adopts your exact persona, rules, and announcements.
            The chatbot will <strong>still automatically fetch and append live project case studies and tech stacks</strong> from <code style={{ color: '#d1fae5', background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4 }}>https://internship.datacrumbs.org</code> so your project details remain accurate and up-to-date!
          </div>

        </div>
      </div>
    </div>
  );
}
