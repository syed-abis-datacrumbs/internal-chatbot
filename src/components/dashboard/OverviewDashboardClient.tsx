'use client';

import React, { useState } from 'react';
import type { Stats } from '@/lib/redis';
import { useTheme } from '@/context/ThemeContext';

const NEON_DARK = '#5ce46d';
const NEON_LIGHT = '#059669';
const CYAN   = '#38bdf8';
const YELLOW = '#e4e15c';
const PURPLE = '#a855f7';
const ORANGE = '#f97316';
const RED    = '#f43f5e';
const SLATE  = '#64748b';
const BG     = '#090d0b';

function smooth(pts: { x: number; y: number }[]): string {
  if (!pts.length) return '';
  let d = `M${pts[0].x.toFixed(0)},${pts[0].y.toFixed(0)}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(0);
    d += ` C${cx},${pts[i - 1].y.toFixed(0)} ${cx},${pts[i].y.toFixed(0)} ${pts[i].x.toFixed(0)},${pts[i].y.toFixed(0)}`;
  }
  return d;
}

export default function OverviewDashboardClient({ stats }: { stats: Stats }) {
  const { isLight } = useTheme();
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [copiedNotification, setCopiedNotification] = useState(false);

  const NEON = isLight ? NEON_LIGHT : NEON_DARK;
  const glass = isLight
    ? {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
      }
    : {
        background: 'linear-gradient(180deg, rgba(20,29,25,0.85) 0%, rgba(13,20,17,0.92) 100%)',
        border: '1px solid #202d26',
        backdropFilter: 'blur(12px)',
      };
  const titleColor = isLight ? '#0f172a' : '#ffffff';
  const subtitleColor = isLight ? '#475569' : '#9ca3af';
  const dimColor = isLight ? '#94a3b8' : '#6b7280';
  const trackColor = isLight ? '#f1f5f9' : '#16231b';
  const circleBg = isLight ? '#ffffff' : BG;
  const streamBg = isLight ? '#ffffff' : '#0d1511';
  const streamBorder = isLight ? '#e2e8f0' : '#1a271f';

  const activeChartData = timeRange === '7d' ? stats.last7Days : stats.last30Days;

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ['Date', 'MessageCount'];
    const rows = activeChartData.map(d => [d.date, d.count]);
    const funnelHeader = ['FunnelStage', 'Count', 'ConversionRate', 'Dropoff'];
    const funnelRows = stats.funnel.stages.map(s => [s.label, s.count, `${s.pct}%`, `${s.dropoffPct}%`]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      ['# Activity Trend', headers.join(','), ...rows.map(r => r.join(',')), '',
       '# Sales & Enrollment Funnel', funnelHeader.join(','), ...funnelRows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `process-analytics-${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const today = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── 1. Top-Left Trend Math ──────────────────────────────────────────────
  const W1 = 360, H1 = 140;
  const rawMax1 = Math.max(...activeChartData.map(d => d.count), 0);
  const niceMax1 = rawMax1 === 0 ? 10 : Math.ceil(rawMax1 * 1.35);
  const targetVal1 = Math.max(Math.round(niceMax1 * 0.75), 5);

  const toY1 = (c: number) => 15 + (1 - c / niceMax1) * 95;
  const pts1 = activeChartData.map((d, i) => ({
    x: activeChartData.length <= 1 ? W1 / 2 : (i / (activeChartData.length - 1)) * (W1 - 40) + 30,
    y: toY1(d.count),
  }));
  const linePath1 = smooth(pts1);
  const areaPath1 = `${linePath1} L${W1 - 10},${H1 - 20} L30,${H1 - 20} Z`;
  const targetY1 = toY1(targetVal1);

  // ── 2. Top-Middle Donut Math ─────────────────────────────────────────────
  // SVG Donut calculation
  const donutTotal = stats.intents.reduce((acc, i) => acc + i.count, 0) || 1;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const topIntent = stats.intents.reduce((max, i) => (i.count > max.count ? i : max), stats.intents[0]);
  const topIntentLabel = topIntent && topIntent.count > 0 ? `TOP: ${topIntent.topic.split(' ')[0].toUpperCase()}` : 'ALL TOPICS';

  const donutSlices = stats.intents.slice(0, 3).map((item) => {
    const slicePct = item.count / donutTotal;
    const strokeDasharray = `${slicePct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += slicePct;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  // ── 3. Top-Right Circular Completion Math ────────────────────────────────
  const compPct = Math.min(Math.max(stats.pipeline.aiResolutionRate, 10), 100);
  const compRadius = 48;
  const compCircumference = 2 * Math.PI * compRadius;
  const compOffset = compCircumference - (compPct / 100) * compCircumference;

  // ── 4. Hourly Activity Math ────────────────────────────────
  // Sample 6 representative hours: 10 AM, 1 PM, 4 PM, 7 PM, 9 PM, 11 PM
  const sampleHourIdxs = [10, 13, 16, 19, 21, 23];
  const sampleHourLabels = ['10 AM', '1 PM', '4 PM', '7 PM', '9 PM', '11 PM'];
  const activeHourlySource = stats.todayHours.some(v => v > 0) ? stats.todayHours : (stats.allTimeHours ?? stats.todayHours);
  const sampleBars = sampleHourIdxs.map(h => activeHourlySource[h] ?? 0);
  const maxCol = Math.max(...sampleBars, 4);
  const colTarget = Math.max(Math.round(maxCol * 0.7), 2);
  const peakHourBadge = stats.peakHourLabel || (stats.todayHours.some(v => v > 0) ? 'PEAK: TODAY' : 'PEAK: 1 PM');

  // ── 5. Recency / Follow-Up Status ──────────────────────────
  const followUpCols = [
    { label: '< 24 Hours', count: stats.followUpStatus?.under24h ?? stats.todayContacts, color: NEON },
    { label: '2-4 Days', count: stats.followUpStatus?.days2to4 ?? 0, color: isLight ? '#d97706' : YELLOW },
    { label: '5-7 Days', count: stats.followUpStatus?.days5to7 ?? 0, color: ORANGE },
    { label: '> 10 Days', count: stats.followUpStatus?.over10d ?? 0, color: SLATE },
  ];
  const maxFollowUp = Math.max(...followUpCols.map(c => c.count), 1);


  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '28px 36px 48px' }}>

        {/* ── Top Header Controls ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: titleColor, margin: 0, letterSpacing: '-0.02em' }}>
                Process & Activity Analytics
              </h2>
              <span style={{
                background: isLight ? 'rgba(5, 150, 105, 0.1)' : 'rgba(92, 228, 109, 0.12)',
                color: NEON,
                border: `1px solid ${isLight ? 'rgba(5, 150, 105, 0.25)' : 'rgba(92, 228, 109, 0.25)'}`,
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: NEON, boxShadow: `0 0 6px ${NEON}` }} />
                Live Bot Stream (PKT)
              </span>
            </div>
            <p style={{ fontSize: 13, color: subtitleColor, margin: 0 }}>{today}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* 7d / 30d Toggle */}
            <div style={{ ...glass, padding: 3, borderRadius: 10, display: 'flex', gap: 2 }}>
              <button
                onClick={() => setTimeRange('7d')}
                style={{
                  background: timeRange === '7d' ? (isLight ? '#ecfdf5' : '#182b20') : 'transparent',
                  color: timeRange === '7d' ? NEON : subtitleColor,
                  border: timeRange === '7d' ? (isLight ? '1px solid #a7f3d0' : '1px solid rgba(92,228,109,0.3)') : '1px solid transparent',
                  padding: '6px 14px',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                style={{
                  background: timeRange === '30d' ? (isLight ? '#ecfdf5' : '#182b20') : 'transparent',
                  color: timeRange === '30d' ? NEON : subtitleColor,
                  border: timeRange === '30d' ? (isLight ? '1px solid #a7f3d0' : '1px solid rgba(92,228,109,0.3)') : '1px solid transparent',
                  padding: '6px 14px',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Last 30 Days
              </button>
            </div>

            {/* Export Report */}
            <button
              onClick={handleExportCSV}
              style={{
                ...glass,
                padding: '8px 14px',
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                fontWeight: 600,
                color: titleColor,
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              <svg width="14" height="14" fill="none" stroke={NEON} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {copiedNotification ? 'Report Exported! ✓' : 'Export CSV Report'}
            </button>
          </div>
        </div>

        {/* ── 3x3 GRAPH GRID (MATCHING THE REFERENCE LAYOUT) ─────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>

          {/* ─────────────────────────────────────────────────────────────
              CARD 1 (Top-Left): Line Trend with Benchmark Target Line
             ───────────────────────────────────────────────────────────── */}
          <div style={{ ...glass, borderRadius: 16, padding: '20px 22px', height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: titleColor, margin: 0 }}>Inquiry Trend & Benchmark</h3>
                <p style={{ fontSize: 11, color: subtitleColor, margin: '3px 0 0' }}>Daily chats vs target throughput</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: NEON, background: isLight ? 'rgba(5, 150, 105, 0.1)' : 'rgba(92,228,109,0.12)', border: `1px solid ${isLight ? 'rgba(5, 150, 105, 0.25)' : 'rgba(92,228,109,0.25)'}`, padding: '2px 8px', borderRadius: 4 }}>
                {stats.todayMessages > 0 ? `${stats.todayMessages} TODAY` : `${stats.totalMessages} TOTAL`}
              </span>
            </div>

            {/* SVG Line with Target Line */}
            <div style={{ position: 'relative', width: '100%', height: 160 }}>
              <svg viewBox={`0 0 ${W1} ${H1}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="gFillC1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={NEON} stopOpacity={isLight ? '0.2' : '0.25'} />
                    <stop offset="100%" stopColor={NEON} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Horizontal Dashed Target Line */}
                <line x1="30" y1={targetY1} x2={W1 - 10} y2={targetY1} stroke={isLight ? '#d97706' : YELLOW} strokeWidth="1.5" strokeDasharray="4 4" />
                <text x={W1 - 95} y={targetY1 - 5} fill={isLight ? '#d97706' : YELLOW} fontSize="10" fontWeight="600">Target {targetVal1}/day</text>

                {/* Filled Area */}
                <path d={areaPath1} fill="url(#gFillC1)" />

                {/* Main Curve */}
                <path d={linePath1} fill="none" stroke={NEON} strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 6px ${isLight ? 'rgba(5, 150, 105, 0.35)' : 'rgba(92,228,109,0.6)'})` }} />

                {/* Dots */}
                {pts1.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={circleBg} stroke={NEON} strokeWidth="2" />
                ))}
              </svg>

              {/* X Axis Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: dimColor, paddingLeft: 20, paddingRight: 10, marginTop: 4 }}>
                {activeChartData.filter((_, i) => timeRange === '7d' || i % 5 === 0).map((d, i) => (
                  <span key={i}>
                    {new Date(d.date + 'T00:00:00').toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              CARD 2 (Top-Middle): Segmented Donut with Right Legend
             ───────────────────────────────────────────────────────────── */}
          <div style={{ ...glass, borderRadius: 16, padding: '20px 22px', height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: titleColor, margin: 0 }}>Inquiries by Category</h3>
                <p style={{ fontSize: 11, color: subtitleColor, margin: '3px 0 0' }}>Distribution of active customer topics</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: CYAN, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', padding: '2px 8px', borderRadius: 4 }}>
                {topIntentLabel}
              </span>
            </div>

            {/* Donut + Legend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, height: 160 }}>
              {/* Donut SVG */}
              <div style={{ width: 130, height: 130, position: 'relative', flexShrink: 0 }}>
                <svg viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="65" cy="65" r={radius} fill="transparent" stroke={trackColor} strokeWidth="18" />
                  {donutSlices.map((s, idx) => (
                    <circle
                      key={idx}
                      cx="65"
                      cy="65"
                      r={radius}
                      fill="transparent"
                      stroke={s.color}
                      strokeWidth="18"
                      strokeDasharray={s.strokeDasharray}
                      strokeDashoffset={s.strokeDashoffset}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  ))}
                </svg>
              </div>

              {/* Legend List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.intents.slice(0, 3).map((item) => (
                  <div key={item.topic} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isLight ? '#334155' : '#d1d5db' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 95 }}>
                        {item.topic.split(' ')[0]}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: titleColor }}>{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              CARD 3 (Top-Right): Circular Radial Completion Gauge
             ───────────────────────────────────────────────────────────── */}
          <div style={{ ...glass, borderRadius: 16, padding: '20px 22px', height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: titleColor, margin: 0 }}>AI Autonomous Rate</h3>
                <p style={{ fontSize: 11, color: subtitleColor, margin: '3px 0 0' }}>Inquiries handled with zero human takeover</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: NEON, background: isLight ? 'rgba(5, 150, 105, 0.1)' : 'rgba(92,228,109,0.12)', border: `1px solid ${isLight ? 'rgba(5, 150, 105, 0.25)' : 'rgba(92,228,109,0.25)'}`, padding: '2px 8px', borderRadius: 4 }}>
                {compPct}% OPTIMAL
              </span>
            </div>

            {/* Circular Gauge Ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, position: 'relative' }}>
              <div style={{ width: 130, height: 130, position: 'relative' }}>
                <svg viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="65" cy="65" r={compRadius} fill="transparent" stroke={trackColor} strokeWidth="14" />
                  <circle
                    cx="65"
                    cy="65"
                    r={compRadius}
                    fill="transparent"
                    stroke={NEON}
                    strokeWidth="14"
                    strokeDasharray={compCircumference}
                    strokeDashoffset={compOffset}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 8px ${isLight ? 'rgba(5, 150, 105, 0.4)' : 'rgba(92,228,109,0.6)'})`, transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>

                {/* Center text */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: titleColor, letterSpacing: '-0.02em' }}>
                    {compPct}%
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: NEON, letterSpacing: '0.08em', marginTop: 1 }}>
                    AUTOMATED
                  </span>
                </div>
              </div>
            </div>
          </div>


          {/* ─────────────────────────────────────────────────────────────
              CARD 6 (Middle-Right): Vertical Column Chart with Benchmark Line
             ───────────────────────────────────────────────────────────── */}
          <div style={{ ...glass, borderRadius: 16, padding: '20px 22px', height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: titleColor, margin: 0 }}>Hourly Inquiries vs Target</h3>
                <p style={{ fontSize: 11, color: subtitleColor, margin: '3px 0 0' }}>Activity across peak windows</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: isLight ? '#b45309' : YELLOW, background: isLight ? 'rgba(180,83,9,0.1)' : 'rgba(228,225,92,0.12)', border: `1px solid ${isLight ? 'rgba(180,83,9,0.25)' : 'rgba(228,225,92,0.25)'}`, padding: '2px 8px', borderRadius: 4 }}>
                {peakHourBadge}
              </span>
            </div>

            {/* Vertical Bars SVG */}
            <div style={{ position: 'relative', width: '100%', height: 160 }}>
              <svg viewBox="0 0 300 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                {/* Horizontal Dashed Target Line */}
                <line x1="10" y1="40" x2="290" y2="40" stroke={isLight ? '#e11d48' : '#f43f5e'} strokeWidth="1.2" strokeDasharray="4 4" />
                <text x="215" y="34" fill={isLight ? '#e11d48' : '#f43f5e'} fontSize="9" fontWeight="700">Target Benchmark</text>

                {/* Vertical Bars */}
                {sampleBars.map((val, idx) => {
                  const barH = Math.max((val / maxCol) * 80, val > 0 ? 30 : 12);
                  const x = 20 + idx * 46;
                  const y = 100 - barH;
                  const isOver = val >= colTarget;

                  return (
                    <g key={idx}>
                      <rect
                        x={x}
                        y={y}
                        width="20"
                        height={barH}
                        rx="4"
                        fill={isOver ? NEON : (isLight ? '#cbd5e1' : '#2a4434')}
                        style={{ filter: isOver ? `drop-shadow(0 0 6px ${isLight ? 'rgba(5, 150, 105, 0.4)' : 'rgba(92,228,109,0.7)'})` : 'none' }}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* X Axis Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: subtitleColor, paddingLeft: 10, paddingRight: 10, marginTop: 4 }}>
                {sampleHourLabels.map(l => <span key={l}>{l}</span>)}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              CARD 7 (Bottom-Left): Funnel Milestones Bar
             ───────────────────────────────────────────────────────────── */}
          <div style={{ ...glass, borderRadius: 16, padding: '20px 22px', height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: titleColor, margin: 0 }}>Funnel Stage Progress</h3>
                <p style={{ fontSize: 11, color: subtitleColor, margin: '3px 0 0' }}>Conversion by lifecycle step</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: NEON, background: isLight ? 'rgba(5, 150, 105, 0.1)' : 'rgba(92,228,109,0.12)', border: `1px solid ${isLight ? 'rgba(5, 150, 105, 0.25)' : 'rgba(92,228,109,0.25)'}`, padding: '2px 8px', borderRadius: 4 }}>
                {stats.totalContacts} LEADS
              </span>
            </div>

            {/* Funnel Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: 160, justifyContent: 'center' }}>
              {stats.funnel.stages.slice(0, 4).map(st => (
                <div key={st.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: isLight ? '#334155' : '#d1d5db' }}>{st.label}</span>
                    <span style={{ color: NEON, fontWeight: 700 }}>{st.count} ({st.pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: trackColor, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(st.pct, 5)}%`, height: '100%', background: NEON, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              CARD 8 (Bottom-Center): Inactive / Follow-up Needed Leads
             ───────────────────────────────────────────────────────────── */}
          <div style={{ ...glass, borderRadius: 16, padding: '20px 22px', height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: titleColor, margin: 0 }}>Lead Follow-up Status</h3>
                <p style={{ fontSize: 11, color: subtitleColor, margin: '3px 0 0' }}>Contacts needing staff re-engagement</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: isLight ? '#b45309' : YELLOW, background: isLight ? 'rgba(180,83,9,0.1)' : 'rgba(228,225,92,0.12)', border: `1px solid ${isLight ? 'rgba(180,83,9,0.25)' : 'rgba(228,225,92,0.25)'}`, padding: '2px 8px', borderRadius: 4 }}>
                {stats.pipeline.humanTakeovers > 0 ? `${stats.pipeline.humanTakeovers} ESCALATED` : `${stats.totalContacts} TOTAL`}
              </span>
            </div>

            {/* Recency Column Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 140, padding: '0 10px' }}>
              {followUpCols.map(col => (
                <div key={col.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: col.color }}>{col.count}</div>
                  <div style={{ width: 36, height: Math.max((col.count / maxFollowUp) * 85, col.count > 0 ? 18 : 4), background: col.color, borderRadius: '4px 4px 0 0', opacity: 0.9 }} />
                  <div style={{ fontSize: 9, color: subtitleColor, whiteSpace: 'nowrap' }}>{col.label}</div>
                </div>
              ))}
            </div>
          </div>


        </div>

        {/* ── LIVE PROCESS ACTIVITY STREAM ───────────────────────────────── */}
        <div style={{ ...glass, borderRadius: 16, padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: titleColor, margin: 0 }}>Live Process Activity Stream</h3>
              <p style={{ fontSize: 11, color: subtitleColor, margin: '2px 0 0' }}>Real-time user queries handled and resolved by the AI agent</p>
            </div>
            <span style={{ fontSize: 11, color: dimColor }}>Showing latest 10 exchanges</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.recentActivities.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: dimColor, fontSize: 13 }}>
                No recent activity recorded yet.
              </div>
            ) : (
              stats.recentActivities.map((act, i) => {
                const intentColor =
                  act.intent === 'Brochure' ? NEON :
                  act.intent === 'Pricing' ? CYAN :
                  act.intent === 'Enrollment' ? PURPLE :
                  act.intent === 'Demo' ? ORANGE : SLATE;

                return (
                  <div
                    key={i}
                    style={{
                      background: streamBg,
                      border: `1px solid ${streamBorder}`,
                      borderRadius: 10,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: isLight ? '#ecfdf5' : '#142219',
                        border: `1px solid ${isLight ? '#a7f3d0' : '#202d26'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: NEON, fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {(act.name?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: titleColor }}>
                          {act.name ? act.name : `+${act.phone}`}
                        </div>
                        <div style={{ fontSize: 10, color: dimColor }}>
                          {new Date(act.timestamp).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Message snippet */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: isLight ? '#334155' : '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ color: subtitleColor }}>User:</span> &ldquo;{act.lastMessage}&rdquo;
                      </div>
                      <div style={{ fontSize: 11, color: dimColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                        <span style={{ color: NEON }}>Bot:</span> {act.reply}
                      </div>
                    </div>

                    {/* Intent Tag */}
                    <div style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: intentColor,
                      background: `${intentColor}15`,
                      border: `1px solid ${intentColor}30`,
                      padding: '3px 8px',
                      borderRadius: 6,
                      whiteSpace: 'nowrap',
                    }}>
                      {act.intent}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
