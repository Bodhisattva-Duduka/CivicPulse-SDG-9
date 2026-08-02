import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, MapPin, PlusCircle, List, LayoutDashboard, LogOut, LogIn, UserPlus } from 'lucide-react';
import { isAuthenticated, getUser, removeToken } from '../lib/auth';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const authenticated = isAuthenticated();
  const user = authenticated ? getUser() : null;
  const isDeptOrAdmin = user && (user.role === 'department' || user.role === 'admin');

  const handleLogout = () => {
    removeToken();
    navigate('/');
    window.location.reload();
  };

  const isActive = (path) => location.pathname === path;

  const linkStyle = (path) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 500,
    color: isActive(path) ? 'var(--color-accent)' : 'var(--color-text-muted)',
    textDecoration: 'none',
    transition: 'color 0.2s',
    whiteSpace: 'nowrap'
  });

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(11, 11, 13, 0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border)',
      padding: '0 24px'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '56px'
      }}>
        {/* Logo */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          textDecoration: 'none',
          color: 'var(--color-text-primary)'
        }}>
          <Activity size={22} color="var(--color-accent)" />
          <span style={{
            fontSize: '17px',
            fontWeight: 700,
            letterSpacing: '-0.02em'
          }}>
            CivicPulse
          </span>
        </Link>

        {/* Nav links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Link to="/map" style={linkStyle('/map')}>
            <MapPin size={15} />
            <span className="hidden sm:inline">Map</span>
          </Link>

          {authenticated && !isDeptOrAdmin && (
            <>
              <Link to="/report" style={linkStyle('/report')}>
                <PlusCircle size={15} />
                <span className="hidden sm:inline">Report</span>
              </Link>
              <Link to="/my-complaints" style={linkStyle('/my-complaints')}>
                <List size={15} />
                <span className="hidden sm:inline">My Reports</span>
              </Link>
            </>
          )}

          {isDeptOrAdmin && (
            <Link to="/department" style={linkStyle('/department')}>
              <LayoutDashboard size={15} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}

          {authenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
              <span style={{
                fontSize: '12px',
                color: 'var(--color-text-dimmed)',
                fontFamily: 'var(--font-mono)',
                padding: '4px 8px',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-sm)'
              }}>
                {user?.name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.2s'
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
              <Link to="/login" style={{
                ...linkStyle('/login'),
                border: '1px solid var(--color-border)',
              }}>
                <LogIn size={14} />
                Sign in
              </Link>
              <Link to="/signup" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: 'var(--color-accent)',
                color: '#FFFFFF',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}>
                <UserPlus size={14} />
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
