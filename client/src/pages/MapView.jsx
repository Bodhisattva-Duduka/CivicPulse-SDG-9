import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowUp, Filter, List, Map as MapIcon, Loader } from 'lucide-react';
import api from '../lib/api';
import { isAuthenticated, getUser } from '../lib/auth';
import { CATEGORY_LABELS, CATEGORIES, STATUSES, STATUS_COLORS } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import ComplaintCard from '../components/ComplaintCard';

function AutoFitBounds({ items }) {
  const map = useMap();
  useEffect(() => {
    if (items && items.length > 0) {
      const validPoints = items
        .map(c => c.location?.coordinates)
        .filter(coords => Array.isArray(coords) && coords.length === 2);
      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints.map(coords => [coords[1], coords[0]]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [items, map]);
  return null;
}

export default function MapViewPage() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('map');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const authenticated = isAuthenticated();
  const user = authenticated ? getUser() : null;

  useEffect(() => {
    api.get('/complaints/public')
      .then(res => setComplaints(res.data.complaints || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpvote = async (id) => {
    if (!authenticated) { navigate('/login'); return; }
    try {
      const res = await api.post(`/complaints/${id}/upvote`);
      setComplaints(prev => prev.map(c => c._id === id ? { ...c, ...res.data.complaint } : c));
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
    }
  };

  const filtered = complaints.filter(c => {
    if (categoryFilter && c.category !== categoryFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  const center = [17.385, 78.4867];
  const sel = { padding:'6px 10px', borderRadius:'var(--radius-md)', border:'1px solid var(--color-border)', backgroundColor:'var(--color-bg-input)', color:'var(--color-text-primary)', fontSize:'13px', fontFamily:'var(--font-sans)', outline:'none' };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'12px 24px', borderBottom:'1px solid var(--color-border)', display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap', backgroundColor:'var(--color-bg-card)' }}>
        <Filter size={14} color="var(--color-text-dimmed)" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={sel}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={sel}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:'12px', color:'var(--color-text-dimmed)', fontFamily:'var(--font-mono)' }}>{filtered.length} reports</span>
        <div style={{ display:'flex', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
          <button onClick={() => setView('map')} style={{ padding:'6px 10px', border:'none', backgroundColor:view==='map'?'var(--color-bg-elevated)':'transparent', color:view==='map'?'var(--color-text-primary)':'var(--color-text-dimmed)', cursor:'pointer', display:'flex', alignItems:'center' }}><MapIcon size={14} /></button>
          <button onClick={() => setView('list')} style={{ padding:'6px 10px', border:'none', borderLeft:'1px solid var(--color-border)', backgroundColor:view==='list'?'var(--color-bg-elevated)':'transparent', color:view==='list'?'var(--color-text-primary)':'var(--color-text-dimmed)', cursor:'pointer', display:'flex', alignItems:'center' }}><List size={14} /></button>
        </div>
      </div>

      <div style={{ flex:1, position:'relative' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'400px', color:'var(--color-text-muted)' }}><Loader size={24} className="animate-spin" /></div>
        ) : view === 'map' ? (
          <MapContainer center={center} zoom={12} style={{ height:'100%', minHeight:'calc(100vh - 120px)', width:'100%' }}>
            <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <AutoFitBounds items={filtered} />
            {filtered.map(c => (
              <CircleMarker key={c._id} center={[c.location.coordinates[1], c.location.coordinates[0]]} radius={8} fillColor={STATUS_COLORS[c.status]||'#5B7DB1'} fillOpacity={0.95} stroke weight={2} color="#FFFFFF">
                <Popup><div style={{ fontFamily:'var(--font-sans)', minWidth:'160px' }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'#8B8D93', marginBottom:'4px' }}>{c.ticketId||c._id?.slice(-6)}</div>
                  <div style={{ fontWeight:600, marginBottom:'6px' }}>{CATEGORY_LABELS[c.category]}</div>
                  <div style={{ display:'flex', gap:'6px', marginBottom:'8px' }}><StatusBadge status={c.status} deadline={c.deadline} compact /><PriorityBadge severity={c.severity} /></div>
                  <button onClick={() => handleUpvote(c._id)} style={{ padding:'3px 8px', fontSize:'11px', borderRadius:'var(--radius-sm)', border:'1px solid var(--color-border)', backgroundColor:'transparent', color:'var(--color-accent)', cursor:'pointer' }}>Upvote ({c.upvotes||0})</button>
                  <a href={`/complaints/${c._id}`} style={{ display:'block', marginTop:'6px', fontSize:'12px', color:'var(--color-accent)' }}>View details</a>
                </div></Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        ) : (
          <div style={{ padding:'20px 24px', maxWidth:'800px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'12px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 24px', color:'var(--color-text-muted)' }}>
                <MapIcon size={40} color="var(--color-text-dimmed)" style={{ marginBottom:'16px' }} />
                <p style={{ fontSize:'15px', fontWeight:500 }}>No reports match your filters</p>
              </div>
            ) : filtered.map(c => <ComplaintCard key={c._id} complaint={c} showActions onUpvote={handleUpvote} userId={user?.id} />)}
          </div>
        )}
      </div>
    </div>
  );
}
