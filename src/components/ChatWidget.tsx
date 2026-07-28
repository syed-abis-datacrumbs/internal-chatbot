'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'bot';
  content: string;
  time: string;
}

interface HistoryMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const STORAGE_KEY = 'dc_chat_history';

export default function ChatWidget() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatMessage(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#2AAA8A;font-weight:600;text-decoration:underline;">$1</a>')
      .replace(/\n/g, '<br>');
  }

  function buildHistory(): HistoryMessage[] {
    return messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text, time: getTime() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: buildHistory() }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'bot',
        content: data.reply || 'Sorry, something went wrong.',
        time: getTime(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        content: 'Connection error. Please try again.',
        time: getTime(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open chat"
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: '50%',
          background: '#2AAA8A', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(42,170,138,0.45)',
          zIndex: 9999, transition: 'transform 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24,
          width: 380, height: 520,
          background: '#fff', borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.16)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          zIndex: 9998, animation: 'slideUp 0.25s ease-out',
        }}>

          {/* Header */}
          <div style={{
            background: '#0a0a0a', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#2AAA8A', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>🤖</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                DataCrumbs Assistant
              </div>
              <div style={{ color: '#2AAA8A', fontSize: 11 }}>
                AI & Data Science Bootcamp
              </div>
            </div>
            <button
              onClick={() => setMessages([])}
              title="Clear chat"
              style={{
                marginLeft: 'auto', background: 'transparent', border: 'none',
                color: '#888', cursor: 'pointer', fontSize: 11, padding: '4px 8px',
                borderRadius: 6,
              }}
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: 12,
            display: 'flex', flexDirection: 'column', gap: 8, background: '#f9f9f9',
          }}>
            {messages.length === 0 && (
              <div style={{
                background: '#fff', borderRadius: 12, borderBottomLeftRadius: 4,
                padding: '10px 14px', maxWidth: '85%', fontSize: 13,
                lineHeight: 1.5, color: '#333',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}>
                👋 Hi! I&apos;m the DataCrumbs assistant. Ask me anything about our AI &amp; Data Science Bootcamp!
                <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>{getTime()}</div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div
                  style={{
                    background: msg.role === 'user' ? '#2AAA8A' : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#333',
                    padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
                    borderRadius: 12,
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 12,
                    borderBottomLeftRadius: msg.role === 'bot' ? 4 : 12,
                    boxShadow: msg.role === 'bot' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
                <div style={{
                  fontSize: 10, color: '#bbb', marginTop: 2,
                  textAlign: msg.role === 'user' ? 'right' : 'left',
                }}>
                  {msg.time}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{
                alignSelf: 'flex-start', background: '#fff', padding: '10px 14px',
                borderRadius: 12, borderBottomLeftRadius: 4,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 16 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#ccc',
                      animation: `bounce 1.2s infinite ${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px', background: '#fff',
            borderTop: '1px solid #f0f0f0',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask anything..."
              disabled={loading}
              style={{
                flex: 1, padding: '9px 16px', borderRadius: 20,
                border: '1px solid #e8e8e8', outline: 'none',
                fontSize: 13, background: '#f9f9f9', color: '#333',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: loading || !input.trim() ? '#ddd' : '#2AAA8A',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
