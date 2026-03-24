import { Link } from 'react-router-dom';

const styles = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 40px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid #e2e8f0',
    zIndex: 100,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  brandIcon: {
    width: '36px',
    height: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    background: '#4f46e5',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 700,
  },
  brandText: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1e293b',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
};

export default function LandingHeader() {
  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <div style={styles.brandIcon}>S</div>
        <span style={styles.brandText}>StockPilot</span>
      </div>
      <div style={styles.actions}>
        <Link to="/login" className="landing-btn landing-btn--outline">Log In</Link>
        <Link to="/register" className="landing-btn landing-btn--primary">Register</Link>
      </div>
    </nav>
  );
}
