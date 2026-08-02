import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowUp, Clock, Users } from 'lucide-react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { CATEGORY_LABELS, DEPARTMENT_LABELS } from '../lib/constants';

export default function ComplaintCard({ complaint, showActions = false, onUpvote, userId }) {
  const navigate = useNavigate();

  const deadlineText = useMemo(() => {
    if (!complaint.deadline) return null;
    const deadline = new Date(complaint.deadline);
    const now = new Date();
    const diffMs = deadline - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (complaint.status === 'Resolved') return null;
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1d remaining';
    return `${diffDays}d remaining`;
  }, [complaint.deadline, complaint.status]);

  const isOverdue = complaint.status !== 'Resolved' && complaint.deadline && new Date(complaint.deadline) < new Date();
  const hasUpvoted = userId && complaint.upvotedBy?.includes(userId);

  return (
    <div
      className="animate-fade-in"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        cursor: 'pointer',
        transition: 'border-color 0.2s'
      }}
      onClick={() => navigate(`/complaints/${complaint._id}`)}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-text-dimmed)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
    >
      {/* Ticket header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.03em'
        }}>
          {complaint.ticketId || `CP-${complaint._id?.slice(-6).toUpperCase()}`}
        </span>
        <StatusBadge status={complaint.status} deadline={complaint.deadline} compact />
      </div>

      {/* Photo + info */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        {complaint.photoUrl && (
          <img
            src={complaint.photoUrl}
            alt={CATEGORY_LABELS[complaint.category]}
            style={{
              width: '80px',
              height: '60px',
              objectFit: 'cover',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              flexShrink: 0
            }}
            loading="lazy"
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '4px'
          }}>
            {CATEGORY_LABELS[complaint.category] || complaint.category}
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PriorityBadge severity={complaint.severity} />
            <span style={{
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)'
            }}>
              {DEPARTMENT_LABELS[complaint.department] || complaint.department}
            </span>
          </div>
        </div>
      </div>

      {complaint.description && (
        <p style={{
          margin: '0 0 12px',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          lineHeight: '1.5',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {complaint.description}
        </p>
      )}

      {/* Dashed tear-off divider — work-order ticket feel */}
      <div className="ticket-divider" />

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: 'var(--color-text-muted)'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUp size={12} />
            {complaint.upvotes || 0}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={12} />
            {complaint.confirmations || 0}
          </span>
          {deadlineText && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: isOverdue ? 'var(--color-status-overdue)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              fontWeight: isOverdue ? 600 : 400
            }}>
              <Clock size={12} />
              {deadlineText}
            </span>
          )}
        </div>

        {showActions && onUpvote && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!hasUpvoted) onUpvote(complaint._id);
            }}
            disabled={hasUpvoted}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: hasUpvoted ? 'var(--color-bg-elevated)' : 'transparent',
              color: hasUpvoted ? 'var(--color-text-dimmed)' : 'var(--color-accent)',
              cursor: hasUpvoted ? 'default' : 'pointer',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            <ArrowUp size={12} />
            {hasUpvoted ? 'Upvoted' : 'Upvote'}
          </button>
        )}

        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          {new Date(complaint.timestamps?.reported || complaint.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
}
