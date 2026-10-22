'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface PromptUIProps {
  initialPrompt: string;
  defaultPrompt: string;
  isInitiallyCustom?: boolean;
}

export default function PromptUI({ initialPrompt, defaultPrompt, isInitiallyCustom = false }: PromptUIProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [prompt, setPrompt] = useState(initialPrompt);
  const [isCustom, setIsCustom] = useState(isInitiallyCustom);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const neonColor = isLight ? '#16a34a' : '#5ce46d';
  const cardBg = isLight ? '#ffffff' : 'linear-gradient(180deg, rgba(20,29,25,0.85) 0%, rgba(13,20,17,0.95) 100%)';
  const cardBorder = isLight ? '1px solid #e2e8f0' : '1px solid #202d26';
  const headerColor = isLight ? '#0f172a' : '#ffffff';
  const subheaderColor = isLight ? '#64748b' : '#9ca3af';
  const textareaBg = isLight ? '#f8fafc' : 'rgba(9,13,11,0.9)';
  const textareaColor = isLight ? '#0f172a' : '#d1fae5';
  const textareaBorder = isLight ? (focused ? '#16a34a' : '#cbd5e1') : (focused ? '#5ce46d' : '#202d26');
  const statsBg = isLight ? '#ffffff' : 'rgba(20,29,25,0.6)';
  const statsBorder = isLight ? '1px solid #e2e8f0' : '1px solid #202d26';
  const statsDivider = isLight ? '#e2e8f0' : '#202d26';
  const statsLabel = isLight ? '#64748b' : '#6b7280';
  const statsValue = isLight ? '#0f172a' : '#ffffff';
  const resetBtnBorder = isLight ? '1px solid #cbd5e1' : '1px solid #202d26';
  const resetBtnColor = isLight ? '#475569' : '#9ca3af';

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
    <div style={{ flex: 1, overflowY: 'auto', background: isLight ? '#f8fafc' : 'transparent', transition: 'background-color 0.2s ease' }}>
      <div style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 900 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: headerColor, margin: 0 }}>System Prompt</h1>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: isCustom
                    ? (isLight ? 'rgba(22,163,74,0.12)' : 'rgba(92,228,109,0.12)')
                    : (isLight ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.15)'),
                  color: isCustom ? neonColor : (isLight ? '#2563eb' : '#60a5fa'),
                  border: `1px solid ${isCustom
                    ? (isLight ? 'rgba(22,163,74,0.25)' : 'rgba(92,228,109,0.3)')
                    : (isLight ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.3)')}`,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isCustom ? neonColor : (isLight ? '#2563eb' : '#60a5fa') }} />
                  {isCustom ? 'Custom Saved Prompt' : 'Dynamic Live Default'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: subheaderColor, marginTop: 8, lineHeight: 1.5, margin: 0 }}>
                Manage the core AI persona, guidelines, and tone. Edits save to MongoDB and take effect immediately on WhatsApp and website chat.
              </p>
            </div>

            {/* Quick stats */}
            <div style={{
              display: 'flex', gap: 16, background: statsBg, border: statsBorder,
              borderRadius: 10, padding: '8px 16px', flexShrink: 0,
              boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: statsLabel, textTransform: 'uppercase', letterSpacing: 0.5 }}>Lines</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: statsValue }}>{lineCount}</div>
              </div>
              <div style={{ width: 1, background: statsDivider }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: statsLabel, textTransform: 'uppercase', letterSpacing: 0.5 }}>Characters</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: statsValue }}>{charCount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Textarea Card */}
          <div style={{
            background: cardBg, border: cardBorder, borderRadius: 16, padding: 18, marginBottom: 18,
            boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.06)' : '0 4px 20px rgba(0,0,0,0.3)',
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
                color: textareaColor,
                background: textareaBg,
                border: `1.5px solid ${textareaBorder}`,
                borderRadius: 10,
                outline: 'none', resize: 'vertical',
                boxSizing: 'border-box',
                boxShadow: focused ? (isLight ? '0 0 0 3px rgba(22,163,74,0.15)' : '0 0 0 3px rgba(92,228,109,0.12)') : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s, background-color 0.2s',
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
                  background: saving ? (isLight ? '#e2e8f0' : '#1a251f') : (isLight ? '#16a34a' : '#5ce46d'),
                  color: saving ? '#94a3b8' : (isLight ? '#ffffff' : '#000000'),
                  fontWeight: 700, fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: saving ? 'none' : (isLight ? '0 2px 10px rgba(22,163,74,0.25)' : '0 0 20px rgba(92,228,109,0.35)'),
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
                  border: resetBtnBorder,
                  background: isLight ? '#ffffff' : 'transparent',
                  color: saving ? (isLight ? '#cbd5e1' : '#4b5563') : resetBtnColor,
                  fontWeight: 600, fontSize: 13,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!saving) {
                    (e.currentTarget as HTMLElement).style.borderColor = isLight ? '#94a3b8' : '#374151';
                    (e.currentTarget as HTMLElement).style.color = isLight ? '#0f172a' : '#fff';
                  }
                }}
                onMouseLeave={e => {
                  if (!saving) {
                    (e.currentTarget as HTMLElement).style.borderColor = isLight ? '#cbd5e1' : '#202d26';
                    (e.currentTarget as HTMLElement).style.color = resetBtnColor;
                  }
                }}
              >
                Reset to Live Default
              </button>

              {saved && (
                <span style={{ fontSize: 13, color: neonColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>✓</span> Saved! Live bot is now using your updated prompt.
                </span>
              )}

              {error && (
                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                  ✕ {error}
                </span>
              )}
            </div>
          </div>

          {/* Explanation Tip */}
          <div style={{
            background: isLight ? 'rgba(22,163,74,0.06)' : 'rgba(92,228,109,0.04)',
            border: isLight ? '1px solid rgba(22,163,74,0.22)' : '1px solid rgba(92,228,109,0.18)',
            borderRadius: 12, padding: '16px 20px', marginTop: 24,
            fontSize: 12.5, color: isLight ? '#334155' : '#9ca3af', lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 600, color: neonColor, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              💡 How Prompt Customization Works
            </div>
            When you save custom instructions here, the bot adopts your exact persona, rules, and announcements.
            The chatbot will <strong>still automatically fetch and append live project case studies and tech stacks</strong> from <code style={{ color: isLight ? '#15803d' : '#d1fae5', background: isLight ? '#e2e8f0' : 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4 }}>https://internship.datacrumbs.org</code> so your project details remain accurate and up-to-date!
          </div>

        </div>
      </div>
    </div>
  );
}
