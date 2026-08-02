import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Loader } from 'lucide-react';
import api from '../lib/api';
import { setToken, setUser } from '../lib/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', form);
      setToken(res.data.token);
      setUser(res.data.user);

      // Route based on role
      const role = res.data.user.role;
      if (role === 'department' || role === 'admin') {
        navigate('/department');
      } else {
        navigate('/my-complaints');
      }
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px'
      }} className="animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>Sign in</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
            Access your reports or department dashboard
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(229, 72, 77, 0.1)',
            border: '1px solid rgba(229, 72, 77, 0.3)',
            color: 'var(--color-status-overdue)',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '6px',
              color: 'var(--color-text-muted)'
            }}>
              Email
            </label>
            <input
              type="email"
              id="login-email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-input)',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '6px',
              color: 'var(--color-text-muted)'
            }}>
              Password
            </label>
            <input
              type="password"
              id="login-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-input)',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '13px',
          color: 'var(--color-text-muted)'
        }}>
          No account? <Link to="/signup" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Sign up as a citizen</Link>
        </p>
      </div>
    </div>
  );
}
