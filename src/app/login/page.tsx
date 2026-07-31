'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = '/overview';
      } else {
        setError('Invalid email or password.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
      background: '#111827',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Background image */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Image
          src="/images/bg.webp"
          alt="Background"
          fill
          style={{ objectFit: 'cover', opacity: 0.6 }}
          priority
        />
      </div>

      {/* White card */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 440,
        background: '#fff', borderRadius: 28,
        boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        padding: '36px 40px',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Image
            src="/images/datacrumbs-light.png"
            alt="DataCrumbs"
            width={180}
            height={70}
            style={{ objectFit: 'contain' }}
          />
        </div>

        <h2 style={{
          fontSize: 30, fontWeight: 700, textAlign: 'center',
          color: '#111827', margin: '0 0 8px',
        }}>
          Admin Portal
        </h2>
        <p style={{
          textAlign: 'center', color: '#6b7280', fontSize: 14,
          margin: '0 0 28px',
        }}>
          Enter your admin credentials
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              width: '100%', height: 48, padding: '0 16px',
              border: '1.5px solid #d1d5db', borderRadius: 10,
              fontSize: 14, color: '#111827', background: '#fff',
              outline: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#2AAA8A'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; }}
          />

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', height: 48, padding: '0 48px 0 16px',
                border: '1.5px solid #d1d5db', borderRadius: 10,
                fontSize: 14, color: '#111827', background: '#fff',
                outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#2AAA8A'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; }}
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              style={{
                position: 'absolute', right: 14, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9ca3af', padding: 0, display: 'flex',
              }}
            >
              {showPass ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', height: 48,
              border: 'none', borderRadius: 10,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700, color: '#fff',
              backgroundImage: 'url(/images/signin-bg.webp)',
              backgroundSize: 'cover', backgroundPosition: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.30)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', color: '#9ca3af', fontSize: 12,
          marginTop: 24,
        }}>
          Only authorized administrators can access this portal
        </p>

        <p style={{
          textAlign: 'center', color: '#9ca3af', fontSize: 12,
          marginTop: 8,
        }}>
          Powered by <span style={{ color: '#2AAA8A', fontWeight: 600 }}>DataCrumbs</span>
        </p>
      </div>
    </div>
  );
}
