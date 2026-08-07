'use client';

import { toCsv, downloadCsv } from '@/lib/csv';

const NEON   = '#5ce46d';
const BORDER = '#202d26';

export default function DownloadCsvButton({
  filename, headers, rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}) {
  function handleClick() {
    downloadCsv(filename, toCsv(headers, rows));
  }

  return (
    <button
      onClick={handleClick}
      disabled={rows.length === 0}
      title={rows.length === 0 ? 'Nothing to export yet' : 'Download as CSV'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12.5, fontWeight: 600,
        padding: '7px 14px', borderRadius: 8,
        background: rows.length === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(92,228,109,0.08)',
        border: `1px solid ${rows.length === 0 ? BORDER : 'rgba(92,228,109,0.3)'}`,
        color: rows.length === 0 ? '#4b5563' : NEON,
        cursor: rows.length === 0 ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
      </svg>
      Download CSV
    </button>
  );
}
