import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader, CheckCircle, Play, Flag, Clock, ArrowUp, Users, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { getUser } from '../lib/auth';
import { CATEGORY_LABELS, DEPARTMENT_LABELS, DEPARTMENTS, STATUS_COLORS, CATEGORIES } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 16, { duration: 0.8 }); }, [center, map]);
  return null;
}

export default function DepartmentDashboard() {
  const user = getUser();
  const isAdmin = user?.role === 'admin';
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState(isAdmin ? '' : user?.department || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('priority');
  const [flyCenter, setFlyCenter] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState('');
  const [resNote, setResNote] = useState('');

  useEffect(() => { fetchComplaints(); }, [deptFilter, statusFilter, sortBy]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = { sort: sortBy };
      if (deptFilter) params.department = deptFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/complaints/department', { params });
      setComplaints(res.data.complaints || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status, extra = {}) => {
    setActionLoading(id);
    setActionError('');
    try {
      await api.patch(`/complaints/${id}/status`, { status, ...extra });
      await fetchComplaints();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const selectComplaint = (c) => {
    setSelectedId(c._id);
    if (c.location?.coordinates) {
      setFlyCenter([c.location.coordinates[1], c.location.coordinates[0]]);
    }
  };

  const center = [17.385, 78.4867];
  const sel = { padding:'6px 10px', borderRadius:'var(--radius-md)', border:'1px solid var(--color-border)', backgroundColor:'var(--color-bg-input)', color:'var(--color-text-primary)', fontSize:'12px', fontFamily:'var(--font-sans)', outline:'none' };
  const btn = (color) => ({ padding:'4px 10px', borderRadius:'var(--radius-sm)', border:'none', backgroundColor:color, color:'#FFF', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-sans)', display:'flex', alignItems:'center', gap:'4px' });

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      {/* Toolbar */}
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--color-border)', display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', backgroundColor:'var(--color-bg-card)' }}>
        <h1 style={{ fontSize:'16px', fontWeight:600, margin:0, marginRight:'12px' }}>
          {isAdmin ? 'Admin Dashboard' : `${DEPARTMENT_LABELS[user?.department] || ''} Dashboard`}
        </h1>
        {isAdmin && (
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={sel}>
            <option value="">All departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>)}
          </select>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={sel}>
          <option value="">All statuses</option>
          <option value="New">New</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={sel}>
          <option value="priority">Priority</option>
          <option value="newest">Newest</option>
          <option value="deadline">Deadline</option>
        </select>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:'12px', color:'var(--color-text-dimmed)', fontFamily:'var(--font-mono)' }}>{complaints.length} complaints</span>
        <button onClick={fetchComplaints} style={{ padding:'4px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--color-border)', backgroundColor:'transparent', color:'var(--color-text-muted)', fontSize:'12px', cursor:'pointer', fontFamily:'var(--font-sans)' }}>Refresh</button>
      </div>

      {actionError && <div style={{ padding:'8px 16px', backgroundColor:'rgba(229,72,77,0.1)', fontSize:'12px', color:'var(--color-status-overdue)', display:'flex', alignItems:'center', gap:'6px' }}><AlertCircle size={14}/>{actionError}</div>}

      {/* Split view */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Map */}
        <div style={{ flex:1, position:'relative' }}>
          <MapContainer center={center} zoom={12} style={{ height:'100%', width:'100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <FlyTo center={flyCenter} />
            {complaints.map(c => {
              const coords = c.location?.coordinates;
              if (!coords) return null;
              const isSelected = c._id === selectedId;
              return (
                <CircleMarker key={c._id} center={[coords[1], coords[0]]} radius={isSelected ? 12 : 7} fillColor={STATUS_COLORS[c.status]||'#5B7DB1'} fillOpacity={isSelected ? 1 : 0.8} stroke weight={isSelected ? 3 : 1.5} color={isSelected ? '#F2F1ED' : '#0B0B0D'}
                  eventHandlers={{ click: () => selectComplaint(c) }}>
                  <Popup><div style={{ fontFamily:'var(--font-sans)', minWidth:'140px' }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'#8B8D93' }}>{c.ticketId||c._id?.slice(-6)}</div>
                    <div style={{ fontWeight:600, margin:'4px 0' }}>{CATEGORY_LABELS[c.category]}</div>
                    <StatusBadge status={c.status} deadline={c.deadline} compact />
                  </div></Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* List */}
        <div style={{ width:'420px', borderLeft:'1px solid var(--color-border)', overflow:'auto', backgroundColor:'var(--color-bg-page)' }}>
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'200px' }}><Loader size={20} className="animate-spin" /></div>
          ) : complaints.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 16px', color:'var(--color-text-muted)' }}>
              <Flag size={32} color="var(--color-text-dimmed)" />
              <p style={{ fontSize:'14px', marginTop:'12px' }}>No complaints in queue</p>
            </div>
          ) : complaints.map(c => {
            const isSelected = c._id === selectedId;
            const isOv = c.status !== 'Resolved' && c.deadline && new Date(c.deadline) < new Date();
            return (
              <div key={c._id} onClick={() => selectComplaint(c)} style={{
                padding:'12px 16px', borderBottom:'1px solid var(--color-border-subtle)',
                cursor:'pointer', backgroundColor: isSelected ? 'var(--color-bg-card)' : 'transparent',
                borderLeft: isSelected ? '3px solid var(--color-accent)' : '3px solid transparent',
                transition:'background-color 0.15s'
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--color-text-dimmed)' }}>{c.ticketId||c._id?.slice(-6)}</span>
                  <StatusBadge status={c.status} deadline={c.deadline} compact />
                </div>
                <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'4px' }}>{CATEGORY_LABELS[c.category]}</div>
                <div style={{ display:'flex', gap:'6px', alignItems:'center', marginBottom:'6px', flexWrap:'wrap' }}>
                  <PriorityBadge severity={c.severity} />
                  {isAdmin && <span style={{ fontSize:'10px', color:'var(--color-text-dimmed)', fontFamily:'var(--font-mono)' }}>{c.department}</span>}
                  <span style={{ fontSize:'11px', color:'var(--color-text-dimmed)' }}><ArrowUp size={10}/> {c.upvotes||0}</span>
                  <span style={{ fontSize:'11px', color:'var(--color-text-dimmed)' }}><Users size={10}/> {c.confirmations||0}</span>
                  <span style={{ fontSize:'11px', color:'var(--color-text-dimmed)', fontFamily:'var(--font-mono)' }}>P:{c.priorityScore||0}</span>
                </div>
                {c.deadline && (
                  <div style={{ fontSize:'11px', fontFamily:'var(--font-mono)', color:isOv?'var(--color-status-overdue)':'var(--color-text-dimmed)', marginBottom:'6px' }}>
                    <Clock size={10}/> {new Date(c.deadline).toLocaleDateString('en-IN')} {isOv&&'OVERDUE'}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display:'flex', gap:'6px', marginTop:'4px' }} onClick={e => e.stopPropagation()}>
                  {c.status === 'New' && (
                    <button onClick={() => updateStatus(c._id, 'Acknowledged')} disabled={actionLoading===c._id} style={btn('#E8A83C')}>
                      {actionLoading===c._id ? <Loader size={10} className="animate-spin"/> : <CheckCircle size={10}/>} Acknowledge
                    </button>
                  )}
                  {c.status === 'Acknowledged' && (
                    <button onClick={() => updateStatus(c._id, 'In Progress')} disabled={actionLoading===c._id} style={btn('#3B82C4')}>
                      {actionLoading===c._id ? <Loader size={10} className="animate-spin"/> : <Play size={10}/>} Start work
                    </button>
                  )}
                  {c.status === 'In Progress' && (
                    <button onClick={() => {
                      const note = prompt('Resolution note (optional):') || '';
                      updateStatus(c._id, 'Resolved', { resolutionNote: note });
                    }} disabled={actionLoading===c._id} style={btn('#4E9F6B')}>
                      {actionLoading===c._id ? <Loader size={10} className="animate-spin"/> : <Flag size={10}/>} Mark resolved
                    </button>
                  )}
                  <a href={`/complaints/${c._id}`} style={{ fontSize:'11px', color:'var(--color-accent)', alignSelf:'center', marginLeft:'auto' }}>Details</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
