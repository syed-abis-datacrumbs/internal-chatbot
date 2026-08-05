'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/redis';

const NEON   = '#5ce46d';
const BG     = '#090d0b';
const GLASS  = 'linear-gradient(180deg, rgba(20,29,25,0.8) 0%, rgba(13,20,17,0.9) 100%)';
const BORDER = '#202d26';

interface Contact {
  phone: string;
  messages: ChatMessage[];
  lastMessage: ChatMessage;
}

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  if (days <  7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

function formatFull(ts: number) {
  return new Date(ts).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
}

function phoneInitials(phone: string) { return phone.slice(-2); }

function hueFromPhone(phone: string) {
  let h = 0;
  for (const c of phone) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return [140, 160, 180, 200, 220, 260, 280][h % 7];
}

function groupByPhone(messages: ChatMessage[]): Contact[] {
  const map = new Map<string, ChatMessage[]>();
  for (const msg of messages) {
    if (!map.has(msg.from)) map.set(msg.from, []);
    map.get(msg.from)!.push(msg);
  }
  return Array.from(map.entries())
    .map(([phone, msgs]) => ({
      phone,
      messages: msgs.sort((a, b) => b.timestamp - a.timestamp),
      lastMessage: msgs.reduce((l, m) => m.timestamp > l.timestamp ? m : l),
    }))
    .sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
}

export default function ChatsUI({ contacts: initial, total }: { contacts: Contact[]; total: number }) {
  const [contacts,    setContacts]    = useState<Contact[]>(initial);
  const [selected,    setSelected]    = useState<string | null>(initial[0]?.phone ?? null);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [hov,         setHov]         = useState<string | null>(null);
  const [botDisabled, setBotDisabled] = useState<boolean>(false);
  const [toggling,    setToggling]    = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res  = await fetch('/api/messages');
        const data = await res.json() as { messages: ChatMessage[] };
        setContacts(prev => {
          const updated = groupByPhone(data.messages);
          const prevTotal = prev.reduce((s, c) => s + c.messages.length, 0);
          const newTotal  = updated.reduce((s, c) => s + c.messages.length, 0);
          return newTotal !== prevTotal ? updated : prev;
        });
      } catch { /* ignore network errors */ }
    }, 5000);
    return () => clearInterval(poll);
  }, []);

  // Fetch bot status whenever selected contact changes
  useEffect(() => {
    if (!selected) return;
    fetch(`/api/contacts/${encodeURIComponent(selected)}/bot`)
      .then(r => r.json())
      .then((d: { disabled: boolean }) => setBotDisabled(d.disabled))
      .catch(() => {});
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    inputRef.current?.focus();
  }, [selected]);

  async function toggleBot() {
    if (!selected || toggling) return;
    setToggling(true);
    try {
      const res  = await fetch(`/api/contacts/${encodeURIComponent(selected)}/bot`, { method: 'POST' });
      const data = await res.json() as { disabled: boolean };
      setBotDisabled(data.disabled);
    } finally {
      setToggling(false);
    }
  }

  const active = contacts.find(c => c.phone === selected) ?? null;

  async function handleSend() {
    const text = input.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    setInput('');
    const optimistic: ChatMessage = { from: selected, text: '', reply: text, timestamp: Date.now() };
    setContacts(prev => prev.map(c =>
      c.phone === selected
        ? { ...c, messages: [optimistic, ...c.messages], lastMessage: optimistic }
        : c
    ));
    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selected, message: text }),
      });
    } catch { /* optimistic shown */ }
    finally { setSending(false); }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Contact list ── */}
      <div style={{
        width: 280, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: '#0a0f0d',
        borderRight: `1px solid ${BORDER}`,
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Conversations</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} · {total} message{total !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {contacts.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              No conversations yet
            </div>
          ) : contacts.map(c => {
            const isActive   = c.phone === selected;
            const isHovered  = hov === c.phone;
            const h          = hueFromPhone(c.phone);
            return (
              <button
                key={c.phone}
                onClick={() => setSelected(c.phone)}
                onMouseEnter={() => setHov(c.phone)}
                onMouseLeave={() => setHov(null)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '12px 14px',
                  background: isActive
                    ? 'linear-gradient(to right, #1a3020, #0e1f14)'
                    : isHovered ? '#121a16' : 'transparent',
                  borderLeft: `3px solid ${isActive ? NEON : 'transparent'}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: `1px solid ${BORDER}`,
                  transition: 'all 0.15s',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: `hsla(${h},45%,18%,1)`,
                  border: `1.5px solid hsla(${h},45%,30%,1)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: `hsla(${h},60%,70%,1)`,
                }}>
                  {phoneInitials(c.phone)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 600, fontSize: 12.5, color: isActive ? '#fff' : '#d1d5db' }}>
                      +{c.phone}
                    </span>
                    <span style={{ fontSize: 10, color: '#6b7280', flexShrink: 0, marginLeft: 4 }}>
                      {formatTime(c.lastMessage.timestamp)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 11.5, color: '#6b7280', marginTop: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {c.lastMessage.text === '[image]' ? '📷 Photo' : (c.lastMessage.text || c.lastMessage.reply)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: BG }}>
        {active ? (
          <>
            {/* Header */}
            <div style={{
              background: GLASS,
              border: 'none',
              borderBottom: `1px solid ${BORDER}`,
              padding: '14px 24px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: `hsla(${hueFromPhone(active.phone)},45%,18%,1)`,
                border: `1.5px solid ${NEON}`,
                boxShadow: '0 0 8px rgba(92,228,109,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: NEON,
              }}>
                {phoneInitials(active.phone)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>+{active.phone}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                  {active.messages.length} exchange{active.messages.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Bot toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>
                    Bot: <strong style={{ color: botDisabled ? '#ef4444' : NEON }}>{botDisabled ? 'OFF' : 'ON'}</strong>
                  </span>
                  <button
                    onClick={toggleBot}
                    disabled={toggling}
                    title={botDisabled ? 'Enable bot for this contact' : 'Disable bot — take over manually'}
                    style={{
                      width: 40, height: 22, borderRadius: 11, border: 'none',
                      background: botDisabled ? '#374151' : NEON,
                      cursor: toggling ? 'not-allowed' : 'pointer',
                      position: 'relative', transition: 'background 0.2s',
                      boxShadow: botDisabled ? 'none' : '0 0 10px rgba(92,228,109,0.4)',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3,
                      left: botDisabled ? 3 : 21,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                      display: 'block',
                    }} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: NEON, boxShadow: `0 0 8px rgba(92,228,109,0.6)` }} />
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Active</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 28px',
              display: 'flex', flexDirection: 'column', gap: 16,
              background: BG,
            }}>
              {[...active.messages].reverse().map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      fontSize: 10, color: '#4b5563',
                      background: '#0d1511', border: '1px solid #202d26',
                      borderRadius: 20, padding: '3px 10px',
                    }}>
                      {formatFull(msg.timestamp)}
                    </span>
                  </div>

                  {msg.text !== '' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <div style={{ maxWidth: '65%' }}>
                        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3, textAlign: 'right', paddingRight: 4 }}>Customer</div>
                        <div style={{
                          background: `linear-gradient(135deg, ${NEON}, #3db854)`,
                          color: '#000',
                          padding: msg.mediaType === 'image' && msg.mediaUrl ? '5px' : '10px 14px',
                          fontSize: 13, lineHeight: 1.55,
                          borderRadius: '16px 16px 4px 16px',
                          boxShadow: '0 0 12px rgba(92,228,109,0.25)',
                          fontWeight: 500, overflow: 'hidden',
                        }}>
                          {msg.mediaType === 'image' && msg.mediaUrl ? (
                            <a
                              href={`https://drive.google.com/file/d/${msg.mediaUrl}/view`}
                              target="_blank" rel="noreferrer"
                            >
                              <img
                                src={`https://drive.google.com/thumbnail?id=${msg.mediaUrl}&sz=w240`}
                                alt="Payment screenshot"
                                style={{ display: 'block', maxWidth: 240, maxHeight: 240, borderRadius: 11 }}
                              />
                            </a>
                          ) : msg.text === '[image]' ? (
                            <span style={{ fontSize: 20 }}>📷</span>
                          ) : msg.text}
                        </div>
                      </div>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, alignSelf: 'flex-end',
                        background: `hsla(${hueFromPhone(active.phone)},45%,18%,1)`,
                        border: `1.5px solid ${NEON}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: NEON,
                      }}>
                        {phoneInitials(active.phone)}
                      </div>
                    </div>
                  )}

                  {(msg.reply !== '' || msg.text === '') && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0, alignSelf: 'flex-end',
                      background: '#1a251f', border: `1.5px solid ${NEON}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                    }}>🤖</div>
                    <div style={{ maxWidth: '65%' }}>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3, paddingLeft: 4 }}>
                        {msg.text === '' ? 'You (Admin)' : 'DataCrumbs AI'}
                      </div>
                      {msg.mediaType === 'document' && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6,
                          background: 'rgba(92,228,109,0.08)', border: `1px solid rgba(92,228,109,0.3)`,
                          borderRadius: 8, padding: '5px 10px', fontSize: 12, color: NEON,
                        }}>
                          📄 Brochure sent
                        </div>
                      )}
                      <div style={{
                        background: msg.text === '' ? 'linear-gradient(135deg, #1a3020, #0e1f14)' : 'linear-gradient(180deg, rgba(20,29,25,0.9) 0%, rgba(13,20,17,1) 100%)',
                        border: msg.text === '' ? `1px solid ${NEON}` : `1px solid ${BORDER}`,
                        color: '#e5e7eb', padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
                        borderRadius: '16px 16px 16px 4px',
                        boxShadow: msg.text === '' ? `0 0 10px rgba(92,228,109,0.15)` : 'none',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {msg.reply}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              background: GLASS,
              borderTop: `1px solid ${BORDER}`,
              padding: '10px 20px 14px',
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 7 }}>
                Send as admin to <strong style={{ color: '#9ca3af' }}>+{active.phone}</strong>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#0a0f0d', borderRadius: 28,
                padding: '5px 5px 5px 16px',
                border: `1.5px solid ${BORDER}`,
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type a message…"
                  disabled={sending}
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    background: 'transparent', fontSize: 13.5,
                    color: '#e5e7eb', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: sending || !input.trim()
                      ? '#1a251f'
                      : NEON,
                    cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: sending || !input.trim() ? 'none' : `0 0 14px rgba(92,228,109,0.45)`,
                    transition: 'all 0.15s',
                  }}
                >
                  {sending ? (
                    <div style={{
                      width: 14, height: 14,
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderTop: `2px solid ${NEON}`,
                      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                    }} />
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={sending || !input.trim() ? '#6b7280' : '#000'}>
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#0d1511', border: `1px solid ${BORDER}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#d1d5db' }}>No conversation selected</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Pick a contact from the list</div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
