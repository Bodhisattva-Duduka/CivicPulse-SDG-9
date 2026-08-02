import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { MapPin, Camera, Shield, ArrowRight, Zap, Users, Activity } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../lib/api';
import { isAuthenticated } from '../lib/auth';
import { CATEGORY_LABELS, STATUS_COLORS } from '../lib/constants';

function AutoFitBounds({ items }) {
  const map = useMap();
  useEffect(() => {
    if (items && items.length > 0) {
      const validPoints = items
        .map(c => c.location?.coordinates)
        .filter(coords => Array.isArray(coords) && coords.length === 2);
      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints.map(coords => [coords[1], coords[0]]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [items, map]);
  return null;
}

const FEATURES = [
  {
    icon: Camera,
    title: 'Snap and report',
    desc: 'Photograph a civic issue. AI detects the category and severity instantly.'
  },
  {
    icon: MapPin,
    title: 'Auto-geotagged',
    desc: 'GPS pins your report to the exact location. No manual address entry.'
  },
  {
    icon: Shield,
    title: 'Smart routing',
    desc: 'Each report reaches the right department automatically — PWD, Sanitation, Water Board, and more.'
  },
  {
    icon: Users,
    title: 'Community-confirmed',
    desc: 'Duplicate reports merge as confirmations. Upvotes push urgent issues up the queue.'
  },
  {
    icon: Zap,
    title: 'SLA deadlines',
    desc: 'Every acknowledged complaint gets an auto-computed fix deadline. Track overdue issues in real time.'
  }
];

export default function LandingPage() {
  const [complaints, setComplaints] = useState([]);
  const authenticated = isAuthenticated();

  useEffect(() => {
    api.get('/complaints/public')
      .then(res => setComplaints(res.data.complaints || []))
      .catch(() => {});
  }, []);

  const center = [17.385, 78.4867];

  return (
    <div style={{ flex: 1 }}>
      {/* Hero */}
      <section style={{
        padding: '80px 24px 60px',
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-card)',
          marginBottom: '24px',
          fontSize: '13px',
          color: 'var(--color-text-muted)'
        }}>
          <Activity size={14} color="var(--color-accent)" />
          Crowdsourced civic infrastructure reporting
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: 700,
          lineHeight: 1.1,
          marginBottom: '20px',
          letterSpacing: '-0.03em'
        }}>
          Your city's problems,{' '}
          <span style={{ color: 'var(--color-accent)' }}>tracked and fixed</span>
        </h1>

        <p style={{
          fontSize: '18px',
          color: 'var(--color-text-muted)',
          lineHeight: 1.6,
          marginBottom: '32px',
          maxWidth: '560px',
          margin: '0 auto 32px'
        }}>
          Report potholes, broken streetlights, water leaks and more. Every report is AI-classified,
          geotagged, and routed to the right department with an SLA deadline.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={authenticated ? '/report' : '/signup'} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-accent)',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '15px',
            textDecoration: 'none',
            transition: 'background-color 0.2s'
          }}>
            Report an issue
            <ArrowRight size={16} />
          </Link>
          <Link to="/map" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontWeight: 500,
            fontSize: '15px',
            textDecoration: 'none',
            transition: 'border-color 0.2s'
          }}>
            <MapPin size={16} />
            Browse map
          </Link>
        </div>
      </section>

      {/* Live map preview */}
      <section style={{
        padding: '0 24px 60px',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          height: '400px'
        }}>
          <MapContainer
            center={center}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <AutoFitBounds items={complaints} />
            {complaints.map((c) => (
              <CircleMarker
                key={c._id}
                center={[c.location.coordinates[1], c.location.coordinates[0]]}
                radius={7}
                fillColor={STATUS_COLORS[c.status] || '#5B7DB1'}
                fillOpacity={0.95}
                stroke={true}
                weight={2}
                color="#FFFFFF"
              >
                <Popup>
                  <div style={{ fontFamily: 'var(--font-sans)' }}>
                    <strong>{CATEGORY_LABELS[c.category]}</strong>
                    <br />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {c.ticketId || c._id?.slice(-6)}
                    </span>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <p style={{
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--color-text-dimmed)',
          marginTop: '12px'
        }}>
          {complaints.length} reports across the city — updated live
        </p>
      </section>

      {/* Features */}
      <section style={{
        padding: '40px 24px 80px',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: '40px',
          letterSpacing: '-0.02em'
        }}>
          How it works
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              padding: '24px',
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)'
            }}>
              <f.icon size={24} color="var(--color-accent)" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '24px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--color-text-dimmed)',
        fontFamily: 'var(--font-mono)'
      }}>
        CivicPulse — Built for hackathon demo
      </footer>
    </div>
  );
}
