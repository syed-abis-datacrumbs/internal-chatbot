'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';

type CountKey = 'chats' | 'leads' | 'enrollments';

const NAV: { href: string; label: string; countKey?: CountKey; icon: React.ReactNode }[] = [
  {
    href: '/overview',
    label: 'Overview',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: '/chats',
    label: 'Chats',
    countKey: 'chats',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    href: '/contacts',
    label: 'Contacts',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    href: '/prompt',
    label: 'System Prompt',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const [logoutHov, setLogoutHov] = useState(false);
  const [counts] = useState<Record<CountKey, number> | null>(null);
  const { isLight, setTheme } = useTheme();

  const neon = isLight ? '#059669' : '#5ce46d';
  const sidebarBg = isLight ? '#ffffff' : '#090d0b';
  const borderRight = isLight ? '1px solid #e5ede7' : '1px solid #1a251f';

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div style={{
      width: 256, flexShrink: 0,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      borderRight,
      height: '100vh',
      background: sidebarBg,
      transition: 'background-color 0.2s ease, border-color 0.2s ease',
    }}>
      <div style={{ padding: 20 }}>
        {/* Logo */}
        <div style={{ marginBottom: 20, minHeight: 48, display: 'flex', alignItems: 'center' }}>
          <Image
            src={isLight ? '/images/datacrumbs-light.png' : '/logo.png'}
            alt="DataCrumbs"
            width={140}
            height={46}
            priority
            style={{ objectFit: 'contain', objectPosition: 'left' }}
          />
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const active = pathname === item.href;
            const hovering = hovered === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: 'none' }}
                onMouseEnter={() => setHovered(item.href)}
                onMouseLeave={() => setHovered(null)}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8,
                  background: active
                    ? (isLight ? 'linear-gradient(to right, #ecfdf5, #f0fdf4)' : 'linear-gradient(to right, #204027, #122316)')
                    : hovering ? (isLight ? '#f1f5f9' : '#121a16') : 'transparent',
                  border: `1px solid ${active ? (isLight ? '#a7f3d0' : '#2b5133') : 'transparent'}`,
                  boxShadow: active
                    ? (isLight ? '0 2px 10px rgba(16,185,129,0.12)' : '0 0 15px rgba(92,228,109,0.3)')
                    : 'none',
                  color: active ? neon : hovering ? (isLight ? '#0f172a' : '#fff') : (isLight ? '#64748b' : '#9ca3af'),
                  transition: 'all 0.15s ease',
                }}>
                  <span style={{ color: active ? neon : 'inherit', display: 'flex', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, flex: 1 }}>
                    {item.label}
                  </span>
                  {item.countKey && counts != null && (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: active ? neon : (isLight ? '#64748b' : '#6b7280'),
                      background: active
                        ? (isLight ? 'rgba(16,185,129,0.15)' : 'rgba(92,228,109,0.12)')
                        : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'),
                      border: `1px solid ${active ? (isLight ? 'rgba(16,185,129,0.3)' : 'rgba(92,228,109,0.3)') : (isLight ? '#cbd5e1' : '#202d26')}`,
                      borderRadius: 20, padding: '1px 8px',
                      flexShrink: 0,
                    }}>
                      {counts[item.countKey]}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom controls: Theme Switcher + Profile */}
      <div style={{ padding: '0 16px 16px' }}>
        {/* Segmented Theme Switcher */}
        <div style={{
          marginBottom: 12,
          padding: 3,
          background: isLight ? '#f1f5f9' : '#121a16',
          border: `1px solid ${isLight ? '#e2e8f0' : '#202d26'}`,
          borderRadius: 10,
          display: 'flex',
          gap: 3,
        }}>
          <button
            onClick={() => setTheme('dark')}
            title="Switch to Dark Theme"
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '7px 0',
              borderRadius: 7,
              fontSize: 12, fontWeight: 600,
              border: !isLight ? '1px solid #2b5133' : '1px solid transparent',
              background: !isLight ? '#1f3526' : 'transparent',
              color: !isLight ? '#5ce46d' : (isLight ? '#64748b' : '#9ca3af'),
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            Dark
          </button>
          <button
            onClick={() => setTheme('light')}
            title="Switch to Light Theme"
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '7px 0',
              borderRadius: 7,
              fontSize: 12, fontWeight: 600,
              border: isLight ? '1px solid #a7f3d0' : '1px solid transparent',
              background: isLight ? '#ffffff' : 'transparent',
              color: isLight ? '#059669' : '#9ca3af',
              boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Light
          </button>
        </div>

        {/* Profile Card */}
        <div style={{
          background: isLight ? '#ffffff' : 'linear-gradient(180deg, rgba(20,29,25,0.8) 0%, rgba(13,20,17,0.9) 100%)',
          border: `1px solid ${isLight ? '#e2e8f0' : '#202d26'}`,
          borderRadius: 10, padding: '10px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: isLight ? '#ecfdf5' : '#1a251f',
                border: `1.5px solid ${neon}`,
                boxShadow: `0 0 10px ${isLight ? 'rgba(16,185,129,0.15)' : 'rgba(92,228,109,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: neon,
              }}>
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 8, height: 8, borderRadius: '50%',
                background: neon, border: `1.5px solid ${isLight ? '#ffffff' : '#090d0b'}`,
              }} />
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: isLight ? '#0f172a' : '#fff', margin: 0, lineHeight: 1.2 }}>Admin</h3>
              <p style={{ fontSize: 10, color: neon, margin: 0, lineHeight: 1.2, fontWeight: 500 }}>DataCrumbs</p>
            </div>
          </div>
          <button
            onClick={logout}
            onMouseEnter={() => setLogoutHov(true)}
            onMouseLeave={() => setLogoutHov(false)}
            title="Logout"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 6,
              fontSize: 12, color: logoutHov ? '#ef4444' : (isLight ? '#64748b' : '#9ca3af'),
              background: logoutHov ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              border: 'none', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
