import { useState, useEffect } from 'react';
import { List, FileText, Loader } from 'lucide-react';
import api from '../lib/api';
import { getUser } from '../lib/auth';
import ComplaintCard from '../components/ComplaintCard';

export default function MyComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    api.get('/complaints/mine')
      .then(res => setComplaints(res.data.complaints || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'400px', color:'var(--color-text-muted)' }}>
        <Loader size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ flex:1, padding:'32px 24px', maxWidth:'800px', margin:'0 auto', width:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:600, marginBottom:'4px' }}>My reports</h1>
          <p style={{ fontSize:'13px', color:'var(--color-text-muted)', margin:0 }}>
            {complaints.length} report{complaints.length !== 1 ? 's' : ''} filed
          </p>
        </div>
      </div>

      {complaints.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 24px', backgroundColor:'var(--color-bg-card)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)' }}>
          <FileText size={40} color="var(--color-text-dimmed)" style={{ marginBottom:'16px' }} />
          <p style={{ fontSize:'15px', fontWeight:500, marginBottom:'4px' }}>No reports yet</p>
          <p style={{ fontSize:'13px', color:'var(--color-text-muted)', margin:0 }}>
            Spotted a civic issue? <a href="/report" style={{ color:'var(--color-accent)' }}>Report it now</a>
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {complaints.map(c => (
            <ComplaintCard key={c._id} complaint={c} userId={user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
