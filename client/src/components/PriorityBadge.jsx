const SEVERITY_STYLES = {
  low: { bg: '#4E9F6B', text: '#FFFFFF', label: 'LOW' },
  medium: { bg: '#E8A83C', text: '#0B0B0D', label: 'MED' },
  high: { bg: '#E5484D', text: '#FFFFFF', label: 'HIGH' }
};

export default function PriorityBadge({ severity }) {
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium;

  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.text,
        padding: '2px 8px',
        borderRadius: '2px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        display: 'inline-block',
        lineHeight: '1.4'
      }}
    >
      {style.label}
    </span>
  );
}
