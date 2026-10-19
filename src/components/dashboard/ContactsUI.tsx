'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ContactDirectoryItem } from '@/lib/redis';

const NEON = '#5ce46d';

function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11 && clean.startsWith('1')) {
    return `+1 (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 12 && clean.startsWith('92')) {
    return `+92 ${clean.slice(2, 5)} ${clean.slice(5)}`;
  }
  return `+${clean}`;
}

function formatRelativeTime(ts: number): string {
  if (!ts) return 'Never';
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function formatDateTime(ts: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function ContactsUI({ initialContacts }: { initialContacts: ContactDirectoryItem[] }) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'named' | 'active_today' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'lastActive' | 'firstSeen' | 'messages'>('lastActive');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Filter & Sort Logic
  const filteredContacts = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;

    return initialContacts
      .filter(c => {
        // Search Filter
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchesName = Boolean(c.name && c.name.toLowerCase().includes(q));
          const matchesPhone = c.phone.toLowerCase().includes(q);
          const matchesEmail = Boolean(c.email && c.email.toLowerCase().includes(q));
          const matchesMsg = Boolean(c.lastUserMessage && c.lastUserMessage.toLowerCase().includes(q));
          if (!matchesName && !matchesPhone && !matchesEmail && !matchesMsg) return false;
        }

        // Date Filter
        if (dateFilter === 'today') {
          if (now - c.lastActiveAt > oneDay) return false;
        } else if (dateFilter === '7d') {
          if (now - c.lastActiveAt > sevenDays) return false;
        } else if (dateFilter === '30d') {
          if (now - c.lastActiveAt > thirtyDays) return false;
        }

        // Status Filter
        if (statusFilter === 'named') {
          if (!c.name) return false;
        } else if (statusFilter === 'active_today') {
          if (now - c.lastActiveAt > oneDay) return false;
        } else if (statusFilter === 'disabled') {
          if (!c.botDisabled) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'messages') return b.totalMessages - a.totalMessages;
        if (sortBy === 'firstSeen') return a.firstSeenAt - b.firstSeenAt;
        return b.lastActiveAt - a.lastActiveAt;
      });
  }, [initialContacts, search, dateFilter, statusFilter, sortBy]);

  // Export CSV
  const handleExportCsv = () => {
    if (!filteredContacts.length) return;

    const headers = [
      'Phone Number',
      'Contact Name',
      'Email',
      'First Contact Date',
      'Last Active Date',
      'Total Messages',
      'User Messages Sent',
      'Bot Replies Sent',
      'Bot Status',
      'Latest User Message',
      'Latest Bot Reply',
    ];

    const rows = filteredContacts.map(c => [
      `"${c.phone}"`,
      `"${c.name || 'Unidentified'}"`,
      `"${c.email || ''}"`,
      `"${new Date(c.firstSeenAt).toISOString()}"`,
      `"${new Date(c.lastActiveAt).toISOString()}"`,
      c.totalMessages,
      c.userMessagesCount,
      c.botRepliesCount,
      `"${c.botDisabled ? 'Bot Disabled' : 'Automated'}"`,
      `"${(c.lastUserMessage || '').replace(/"/g, '""')}"`,
      `"${(c.lastBotReply || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `datacrumbs_contacts_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Metrics summary
  const totalContactsCount = initialContacts.length;
  const namedCount = initialContacts.filter(c => Boolean(c.name)).length;
  const namedPct = totalContactsCount > 0 ? Math.round((namedCount / totalContactsCount) * 100) : 0;
  const totalMsgsCount = initialContacts.reduce((acc, c) => acc + c.totalMessages, 0);
  const activeTodayCount = initialContacts.filter(c => Date.now() - c.lastActiveAt < 24 * 60 * 60 * 1000).length;

  return (
    <div style={{ padding: '28px 32px', background: '#090d0b', minHeight: '100vh', color: '#e5e7eb' }}>
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f3f4f6', letterSpacing: '-0.02em', margin: 0 }}>
              Contacts & User Directory
            </h1>
            <span style={{
              background: 'rgba(92, 228, 109, 0.12)',
              border: '1px solid rgba(92, 228, 109, 0.3)',
              color: NEON,
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 12,
            }}>
              {totalContactsCount} Total
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
            Search, inspect, and export all customer leads and conversation activity recorded in MongoDB.
          </p>
        </div>

        {/* Action Button: Export CSV */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleExportCsv}
            disabled={!filteredContacts.length}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: filteredContacts.length ? 'rgba(92, 228, 109, 0.15)' : '#1a251f',
              border: `1px solid ${filteredContacts.length ? NEON : '#2d3d34'}`,
              color: filteredContacts.length ? NEON : '#6b7280',
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: filteredContacts.length ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV ({filteredContacts.length})
          </button>
        </div>
      </div>

      {/* ── Metric Highlights ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: '#0f1712', border: '1px solid #1a251f', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, marginBottom: 6 }}>Total Unique Contacts</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#f3f4f6' }}>{totalContactsCount}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Unique WhatsApp numbers</div>
        </div>

        <div style={{ background: '#0f1712', border: '1px solid #1a251f', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, marginBottom: 6 }}>Identified Leads (Named)</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#60a5fa' }}>
            {namedCount} <span style={{ fontSize: 14, fontWeight: 500, color: '#93c5fd' }}>({namedPct}%)</span>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Name automatically captured by AI</div>
        </div>

        <div style={{ background: '#0f1712', border: '1px solid #1a251f', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, marginBottom: 6 }}>Total Messages</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: NEON }}>{totalMsgsCount}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Inbound + automated AI replies</div>
        </div>

        <div style={{ background: '#0f1712', border: '1px solid #1a251f', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, marginBottom: 6 }}>Active in Last 24 Hours</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#f59e0b' }}>{activeTodayCount}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Recent customer inquiries</div>
        </div>
      </div>

      {/* ── Search & Filter Controls Bar ─────────────────────────────── */}
      <div style={{
        background: '#0f1712',
        border: '1px solid #1a251f',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        {/* Search Input */}
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="#9ca3af"
            viewBox="0 0 24 24"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, phone (+1...), email, or message..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: '#090d0b',
              border: '1px solid #1a251f',
              borderRadius: 8,
              padding: '9px 14px 9px 36px',
              color: '#f3f4f6',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Badges & Selectors */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          {/* Time Range Filter */}
          <div style={{ display: 'flex', background: '#090d0b', border: '1px solid #1a251f', borderRadius: 8, padding: 2 }}>
            {(['all', 'today', '7d', '30d'] as const).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: dateFilter === f ? 'rgba(92, 228, 109, 0.15)' : 'transparent',
                  color: dateFilter === f ? NEON : '#9ca3af',
                  fontSize: 12,
                  fontWeight: dateFilter === f ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : f === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            style={{
              background: '#090d0b',
              border: '1px solid #1a251f',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#d1d5db',
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Contacts</option>
            <option value="named">Named Leads Only</option>
            <option value="active_today">Active Today</option>
            <option value="disabled">Bot Disabled Only</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{
              background: '#090d0b',
              border: '1px solid #1a251f',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#d1d5db',
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="lastActive">Sort: Recently Active</option>
            <option value="messages">Sort: Most Messages</option>
            <option value="firstSeen">Sort: Oldest First</option>
          </select>
        </div>
      </div>

      {/* ── Contacts Table ─────────────────────────────────────────── */}
      <div style={{ background: '#0f1712', border: '1px solid #1a251f', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#090d0b', borderBottom: '1px solid #1a251f', color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Contact Info</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Activity Timeline</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Messages</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Latest Message & Reply</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#6b7280' }}>
                    <div style={{ display: 'inline-flex', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: '50%', marginBottom: 12 }}>
                      <svg width="24" height="24" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#d1d5db', marginBottom: 4 }}>No contacts match your filters</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Try clearing your search term or changing your date range filter.</div>
                    {(search || dateFilter !== 'all' || statusFilter !== 'all') && (
                      <button
                        onClick={() => { setSearch(''); setDateFilter('all'); setStatusFilter('all'); }}
                        style={{
                          marginTop: 14,
                          background: 'transparent',
                          border: `1px solid ${NEON}`,
                          color: NEON,
                          padding: '6px 14px',
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredContacts.map(c => {
                  const initials = c.name
                    ? c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    : c.phone.slice(-2);

                  const waUrl = `https://wa.me/${c.phone.replace(/\D/g, '')}`;

                  return (
                    <tr
                      key={c.phone}
                      style={{
                        borderBottom: '1px solid #152219',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#131e17')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Column 1: Contact Info */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Avatar */}
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: c.name ? 'rgba(92, 228, 109, 0.12)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${c.name ? 'rgba(92, 228, 109, 0.3)' : '#26332b'}`,
                            color: c.name ? NEON : '#9ca3af',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 12,
                            flexShrink: 0,
                          }}>
                            {initials}
                          </div>

                          <div>
                            <div style={{ fontWeight: 600, color: c.name ? '#f9fafb' : '#9ca3af', fontSize: 13, marginBottom: 3 }}>
                              {c.name || 'Unidentified Lead'}
                            </div>
                            <div
                              onClick={() => copyToClipboard(c.phone)}
                              title="Click to copy phone number"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: copiedPhone === c.phone ? NEON : '#d1d5db',
                                background: copiedPhone === c.phone ? 'rgba(92, 228, 109, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                border: `1px solid ${copiedPhone === c.phone ? NEON : '#1f2e24'}`,
                                padding: '3px 8px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                width: 'fit-content',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = NEON;
                                e.currentTarget.style.background = 'rgba(92, 228, 109, 0.08)';
                                const icon = e.currentTarget.querySelector('.copy-icon') as HTMLElement;
                                if (icon) icon.style.opacity = '1';
                              }}
                              onMouseLeave={e => {
                                if (copiedPhone !== c.phone) {
                                  e.currentTarget.style.borderColor = '#1f2e24';
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                  const icon = e.currentTarget.querySelector('.copy-icon') as HTMLElement;
                                  if (icon) icon.style.opacity = '0.35';
                                }
                              }}
                            >
                              <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{formatPhone(c.phone)}</span>
                              <span
                                className="copy-icon"
                                style={{
                                  opacity: copiedPhone === c.phone ? 1 : 0.35,
                                  transition: 'opacity 0.15s ease',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                {copiedPhone === c.phone ? (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: NEON }}>✓ Copied</span>
                                ) : (
                                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </span>
                            </div>
                            {c.email && (
                              <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 4 }}>{c.email}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Activity Timeline */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>Active:</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#f3f4f6' }}>{formatRelativeTime(c.lastActiveAt)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          First seen: {formatDateTime(c.firstSeenAt)}
                        </div>
                      </td>

                      {/* Column 3: Messages Pill */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid #1a251f',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#e5e7eb',
                        }}>
                          💬 {c.totalMessages} msgs
                        </span>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                          {c.userMessagesCount} user / {c.botRepliesCount} bot
                        </div>
                      </td>

                      {/* Column 4: Latest Message Snippet */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'top', maxWidth: 300 }}>
                        {c.lastUserMessage ? (
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Customer: </span>
                            <span style={{ fontSize: 12, color: '#e5e7eb' }}>
                              {c.lastUserMessage.length > 70 ? `${c.lastUserMessage.slice(0, 70)}...` : c.lastUserMessage}
                            </span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>No customer message text</div>
                        )}
                        {c.lastBotReply && (
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            <span style={{ fontSize: 10, color: NEON }}>Bot: </span>
                            {c.lastBotReply.length > 70 ? `${c.lastBotReply.slice(0, 70)}...` : c.lastBotReply}
                          </div>
                        )}
                      </td>

                      {/* Column 5: Status Badge */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                        {c.botDisabled ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            color: '#f59e0b',
                          }}>
                            ● Paused
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'rgba(92, 228, 109, 0.1)',
                            border: '1px solid rgba(92, 228, 109, 0.25)',
                            color: NEON,
                          }}>
                            ● Automated
                          </span>
                        )}
                      </td>

                      {/* Column 6: Actions */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {/* Link into Dashboard Chats page */}
                          <Link
                            href="/chats"
                            style={{
                              padding: '6px 12px',
                              borderRadius: 6,
                              background: '#1a251f',
                              border: '1px solid #28392f',
                              color: '#f3f4f6',
                              fontSize: 12,
                              fontWeight: 500,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all 0.12s ease',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = NEON)}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = '#28392f')}
                          >
                            View Chat →
                          </Link>

                          {/* Direct WhatsApp Click-to-chat */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in WhatsApp Web"
                            style={{
                              padding: '6px 8px',
                              borderRadius: 6,
                              background: 'rgba(92, 228, 109, 0.08)',
                              border: '1px solid rgba(92, 228, 109, 0.2)',
                              color: NEON,
                              fontSize: 12,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            💬
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div style={{
          padding: '12px 20px',
          background: '#090d0b',
          borderTop: '1px solid #1a251f',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: '#6b7280',
        }}>
          <div>
            Showing <strong style={{ color: '#d1d5db' }}>{filteredContacts.length}</strong> of{' '}
            <strong style={{ color: '#d1d5db' }}>{totalContactsCount}</strong> contacts
          </div>
          <div>All data synced directly from MongoDB</div>
        </div>
      </div>
    </div>
  );
}
