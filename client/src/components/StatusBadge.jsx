import { useMemo } from 'react';

const STATUS_STYLES = {
  'New': { bg: '#5B7DB1', text: '#FFFFFF' },
  'Acknowledged': { bg: '#E8A83C', text: '#0B0B0D' },
  'In Progress': { bg: '#3B82C4', text: '#FFFFFF' },
  'Resolved': { bg: '#4E9F6B', text: '#FFFFFF' },
  'Overdue': { bg: '#E5484D', text: '#FFFFFF' }
};

export default function StatusBadge({ status, deadline, compact = false }) {
  const isOverdue = useMemo(() => {
    if (status === 'Resolved') return false;
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }, [status, deadline]);

  const displayStatus = isOverdue ? 'Overdue' : status;
  const style = STATUS_STYLES[displayStatus] || STATUS_STYLES['New'];

  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.text,
        padding: compact ? '2px 8px' : '4px 12px',
        borderRadius: '2px',
        fontSize: compact ? '11px' : '12px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        display: 'inline-block',
        lineHeight: '1.4'
      }}
    >
      {displayStatus}
    </span>
  );
}
