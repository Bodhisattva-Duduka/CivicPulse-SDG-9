import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, ArrowUp, Clock, MapPin, Users, Loader, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { isAuthenticated, getUser } from '../lib/auth';
import { CATEGORY_LABELS, DEPARTMENT_LABELS, STATUS_COLORS } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const authenticated = isAuthenticated();
  const user = authenticated ? getUser() : null;

  useEffect(() => {
    api.get(`/complaints/${id}`)
      .then(res => setComplaint(res.data.complaint))
      .catch(() => setError('Report not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpvote = async () => {
    if (!authenticated) { navigate('/login'); return; }
    try {
      const res = await api.post(`/complaints/${id}/upvote`);
      setComplaint(res.data.complaint);
    } catch (err) {
      if (err.response?.status === 400) alert(err.response.data.error);
    }
  };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'400px' }}><Loader size={24} className="animate-spin" /></div>;
  if (error || !complaint) return <div style={{ textAlign:'center', padding:'60px', color:'var(--color-text-muted)' }}><AlertCircle size={40} /><p>{error}</p></div>;

  const c = complaint;
  const isOverdue = c.status !== 'Resolved' && c.deadline && new Date(c.deadline) < new Date();
  const coords = c.location?.coordinates;
  const hasUpvoted = user && c.upvotedBy?.includes(user.id);

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  return (
    <div style={{ flex:1, padding:'24px', maxWidth:'800px', margin:'0 auto', width:'100%' }}>
      <button onClick={() => navigate(-1)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 0', border:'none', backgroundColor:'transparent', color:'var(--color-text-muted)', cursor:'pointer', fontSize:'13px', fontFamily:'var(--font-sans)', marginBottom:'20px' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="animate-fade-in" style={{ backgroundColor:'var(--color-bg-card)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid var(--color-border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'14px', color:'var(--color-text-muted)' }}>{c.ticketId || `CP-${c._id?.slice(-6).toUpperCase()}`}</span>
            <StatusBadge status={c.status} deadline={c.deadline} />
          </div>
          <h1 style={{ fontSize:'20px', fontWeight:600, margin:'0 0 8px' }}>{CATEGORY_LABELS[c.category]}</h1>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
            <PriorityBadge severity={c.severity} />
            <span style={{ fontSize:'12px', color:'var(--color-text-muted)', fontFamily:'var(--font-mono)' }}>{DEPARTMENT_LABELS[c.department]}</span>
            {c.aiConfidence != null && <span style={{ fontSize:'11px', color:'var(--color-text-dimmed)', fontFamily:'var(--font-mono)' }}>AI {Math.round(c.aiConfidence*100)}%</span>}
            {c.categoryOverridden && <span style={{ fontSize:'11px', padding:'1px 6px', borderRadius:'var(--radius-sm)', backgroundColor:'rgba(232,168,60,0.15)', color:'var(--color-status-acknowledged)' }}>Overridden</span>}
          </div>
        </div>

        {/* Photo */}
        {c.photoUrl && (
          <img src={c.photoUrl} alt={CATEGORY_LABELS[c.category]} style={{ width:'100%', maxHeight:'400px', objectFit:'cover' }} />
        )}

        {/* Description */}
        {c.description && (
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--color-border)' }}>
            <p style={{ margin:0, fontSize:'14px', color:'var(--color-text-primary)', lineHeight:1.6 }}>{c.description}</p>
          </div>
        )}

        {/* Location */}
        {coords && (
          <div style={{ height:'200px', borderBottom:'1px solid var(--color-border)' }}>
            <MapContainer center={[coords[1], coords[0]]} zoom={16} style={{ height:'100%', width:'100%' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              <CircleMarker center={[coords[1], coords[0]]} radius={10} fillColor={STATUS_COLORS[c.status]} fillOpacity={0.95} stroke weight={2.5} color="#FFFFFF" />
            </MapContainer>
          </div>
        )}

        <div className="ticket-divider" style={{ margin:'0 20px' }} />

        {/* Timeline */}
        <div style={{ padding:'16px 20px' }}>
          <h3 style={{ fontSize:'13px', fontWeight:600, marginBottom:'12px', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Timeline</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontFamily:'var(--font-mono)', fontSize:'12px' }}>
            <div><span style={{ color:'var(--color-text-dimmed)' }}>Reported:</span> <span>{fmtDate(c.timestamps?.reported)}</span></div>
            <div><span style={{ color:'var(--color-text-dimmed)' }}>Acknowledged:</span> <span>{fmtDate(c.timestamps?.acknowledged)}</span></div>
            <div><span style={{ color:'var(--color-text-dimmed)' }}>In Progress:</span> <span>{fmtDate(c.timestamps?.inProgress)}</span></div>
            <div><span style={{ color:'var(--color-text-dimmed)' }}>Resolved:</span> <span>{fmtDate(c.timestamps?.resolved)}</span></div>
          </div>
          {c.deadline && (
            <div style={{ marginTop:'8px', fontFamily:'var(--font-mono)', fontSize:'12px', color: isOverdue ? 'var(--color-status-overdue)' : 'var(--color-text-muted)' }}>
              <Clock size={12} style={{ verticalAlign:'middle', marginRight:'4px' }} />
              Deadline: {fmtDate(c.deadline)} {isOverdue && '— OVERDUE'}
            </div>
          )}
          {c.resolutionNote && (
            <div style={{ marginTop:'12px', padding:'10px 12px', backgroundColor:'var(--color-bg-elevated)', borderRadius:'var(--radius-md)', fontSize:'13px' }}>
              <span style={{ color:'var(--color-text-dimmed)', fontSize:'11px', fontWeight:600, textTransform:'uppercase' }}>Resolution note</span>
              <p style={{ margin:'4px 0 0', lineHeight:1.5 }}>{c.resolutionNote}</p>
            </div>
          )}
        </div>

        {/* Stats + Actions */}
        <div style={{ padding:'0 20px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:'16px', fontSize:'13px', color:'var(--color-text-muted)' }}>
            <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><ArrowUp size={14} /> {c.upvotes||0} upvotes</span>
            <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><Users size={14} /> {c.confirmations||0} confirmations</span>
            <span style={{ display:'flex', alignItems:'center', gap:'4px', fontFamily:'var(--font-mono)' }}>Score: {c.priorityScore||0}</span>
          </div>
          {c.status !== 'Resolved' && (
            <button onClick={handleUpvote} disabled={hasUpvoted} style={{
              padding:'8px 16px', borderRadius:'var(--radius-md)', border:'1px solid var(--color-border)',
              backgroundColor: hasUpvoted ? 'var(--color-bg-elevated)' : 'transparent',
              color: hasUpvoted ? 'var(--color-text-dimmed)' : 'var(--color-accent)',
              cursor: hasUpvoted ? 'default' : 'pointer', fontSize:'13px', fontWeight:500, fontFamily:'var(--font-sans)',
              display:'flex', alignItems:'center', gap:'6px'
            }}>
              <ArrowUp size={14} /> {hasUpvoted ? 'Upvoted' : 'Upvote'}
            </button>
          )}
        </div>

        {/* Location coordinates */}
        {coords && (
          <div style={{ padding:'0 20px 16px' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--color-text-dimmed)' }}>
              <MapPin size={11} style={{ verticalAlign:'middle' }} /> {coords[1].toFixed(6)}, {coords[0].toFixed(6)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
