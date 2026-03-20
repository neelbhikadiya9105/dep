import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../css/landing.css';
import { apiPost } from '../api/axios.js';

const FEATURES = [
  {
    icon: '📦',
    colorClass: 'landing-feature-card__icon--indigo',
    title: 'Smart Inventory',
    desc: 'Track stock levels in real time with barcode scanning, low-stock alerts, and multi-store support.',
  },
  {
    icon: '🛒',
    colorClass: 'landing-feature-card__icon--blue',
    title: 'Point of Sale',
    desc: 'Fast POS checkout with cash, card, and UPI payments. Barcode scanning built in.',
  },
  {
    icon: '📈',
    colorClass: 'landing-feature-card__icon--green',
    title: 'Reports & Analytics',
    desc: 'Revenue summaries, profit margins, and transaction reports exportable as PDF or CSV.',
  },
  {
    icon: '↩️',
    colorClass: 'landing-feature-card__icon--orange',
    title: 'Returns Management',
    desc: 'Process returns with automatic restock logic based on return reason.',
  },
];

const STEPS = [
  { title: 'Request Access', desc: 'Submit your details using the form below and our team will review it.' },
  { title: 'Get Approved', desc: 'Our platform admin approves your request and sets up your store.' },
  { title: 'Configure', desc: 'Add your products, set up staff accounts, and customise settings.' },
  { title: 'Go Live', desc: 'Start processing sales, tracking inventory, and viewing reports.' },
];

const PREVIEW_BARS = [40, 65, 45, 80, 55, 90, 70, 95, 60, 75, 85, 50];

export default function Landing() {
  const [form, setForm] = useState({ name: '', email: '', businessName: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await apiPost('/auth/access-request', form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-page">
      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-nav__logo">
          <div className="landing-nav__logo-icon">S</div>
          <span className="landing-nav__logo-text">StockPilot</span>
        </div>
        <div className="landing-nav__actions">
          <Link to="/login" className="landing-btn landing-btn--outline">Log In</Link>
          <Link to="/register" className="landing-btn landing-btn--primary">Register</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero__inner">
          <div className="landing-hero__badge">🚀 SaaS Inventory Platform</div>
          <h1 className="landing-hero__title">
            Manage Your Inventory<br />
            <span>Like Never Before</span>
          </h1>
          <p className="landing-hero__subtitle">
            StockPilot gives small and medium businesses a powerful, all-in-one inventory,
            POS, and reporting platform — without the enterprise price tag.
          </p>
          <div className="landing-hero__ctas">
            <Link to="/register" className="landing-btn landing-btn--cta">Get Started Free</Link>
            <Link to="/login" className="landing-btn landing-btn--outline">Log In to Dashboard</Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-section">
        <div className="landing-section__inner">
          <div className="landing-section__header">
            <div className="landing-section__tag">Features</div>
            <h2 className="landing-section__title">Everything you need to run your business</h2>
            <p className="landing-section__desc">
              From inventory tracking to sales reporting, StockPilot covers every operational need.
            </p>
          </div>
          <div className="landing-features__grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="landing-feature-card">
                <div className={`landing-feature-card__icon ${f.colorClass}`}>{f.icon}</div>
                <div className="landing-feature-card__title">{f.title}</div>
                <div className="landing-feature-card__desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-section landing-section--alt">
        <div className="landing-section__inner">
          <div className="landing-section__header">
            <div className="landing-section__tag">How It Works</div>
            <h2 className="landing-section__title">Up and running in minutes</h2>
          </div>
          <div className="landing-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className="landing-step">
                <div className="landing-step__number">{i + 1}</div>
                <div className="landing-step__title">{s.title}</div>
                <div className="landing-step__desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard Preview ── */}
      <section className="landing-section">
        <div className="landing-section__inner">
          <div className="landing-section__header">
            <div className="landing-section__tag">Dashboard Preview</div>
            <h2 className="landing-section__title">Real-time analytics at a glance</h2>
          </div>
          <div className="landing-preview">
            <div className="landing-preview__grid">
              {[
                { label: 'Monthly Revenue', value: '₹1,24,500' },
                { label: "Today's Orders", value: '38' },
                { label: 'Total Products', value: '284' },
                { label: 'Low Stock Items', value: '7' },
              ].map((c) => (
                <div key={c.label} className="landing-preview__card">
                  <div className="landing-preview__card-label">{c.label}</div>
                  <div className="landing-preview__card-value">{c.value}</div>
                </div>
              ))}
            </div>
            <div className="landing-preview__chart">
              {PREVIEW_BARS.map((h, i) => (
                <div
                  key={i}
                  className="landing-preview__bar"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="landing-section landing-section--alt">
        <div className="landing-section__inner">
          <div className="landing-section__header">
            <div className="landing-section__tag">Pricing</div>
            <h2 className="landing-section__title">Simple, transparent pricing</h2>
            <p className="landing-section__desc">
              One flat fee, no hidden charges. Cancel any time.
            </p>
          </div>
          <div className="landing-pricing__grid">
            {/* Starter */}
            <div className="landing-pricing-card">
              <div className="landing-pricing-card__plan">Starter</div>
              <div className="landing-pricing-card__price">Free</div>
              <div className="landing-pricing-card__period">14-day trial</div>
              <ul className="landing-pricing-card__features">
                <li>Up to 100 products</li>
                <li>1 store</li>
                <li>Basic reports</li>
                <li>Email support</li>
              </ul>
              <Link to="/register" className="landing-btn landing-btn--outline" style={{ width: '100%', justifyContent: 'center' }}>
                Start Free Trial
              </Link>
            </div>
            {/* Pro */}
            <div className="landing-pricing-card landing-pricing-card--popular">
              <div className="landing-pricing-card__badge">Most Popular</div>
              <div className="landing-pricing-card__plan">Pro</div>
              <div className="landing-pricing-card__price">₹999</div>
              <div className="landing-pricing-card__period">per month</div>
              <ul className="landing-pricing-card__features">
                <li>Unlimited products</li>
                <li>1 store, multi-staff</li>
                <li>PDF reports & export</li>
                <li>UPI, cash & card payments</li>
                <li>Priority support</li>
              </ul>
              <a href="#request-access" className="landing-btn landing-btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
                Get Started
              </a>
            </div>
            {/* Enterprise */}
            <div className="landing-pricing-card">
              <div className="landing-pricing-card__plan">Enterprise</div>
              <div className="landing-pricing-card__price">Custom</div>
              <div className="landing-pricing-card__period">contact us</div>
              <ul className="landing-pricing-card__features">
                <li>Multiple stores</li>
                <li>Superuser admin panel</li>
                <li>Custom integrations</li>
                <li>Dedicated support</li>
                <li>SLA guarantee</li>
              </ul>
              <a href="#request-access" className="landing-btn landing-btn--outline" style={{ width: '100%', justifyContent: 'center' }}>
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Access Request Form ── */}
      <section id="request-access" className="landing-section">
        <div className="landing-section__inner">
          <div className="landing-section__header">
            <div className="landing-section__tag">Get Access</div>
            <h2 className="landing-section__title">Request Platform Access</h2>
            <p className="landing-section__desc">
              Fill in the form and our team will set up your account within 24 hours.
            </p>
          </div>
          <div className="landing-request-form">
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                <div className="landing-request-form__title">Request Submitted!</div>
                <p className="landing-request-form__subtitle">
                  We've received your request and will be in touch soon.
                  In the meantime, you can <Link to="/login">log in</Link> if you already have an account.
                </p>
              </div>
            ) : (
              <>
                <div className="landing-request-form__title">Request Access</div>
                <p className="landing-request-form__subtitle">
                  Tell us about yourself and your business.
                </p>
                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="landing-form-group">
                    <label>Full Name *</label>
                    <input name="name" value={form.name} onChange={handleChange} required placeholder="Your full name" />
                  </div>
                  <div className="landing-form-group">
                    <label>Email Address *</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@company.com" />
                  </div>
                  <div className="landing-form-group">
                    <label>Business Name</label>
                    <input name="businessName" value={form.businessName} onChange={handleChange} placeholder="Your business or store name" />
                  </div>
                  <div className="landing-form-group">
                    <label>Message (optional)</label>
                    <textarea name="message" value={form.message} onChange={handleChange} placeholder="Tell us more about your needs..." />
                  </div>
                  <button type="submit" disabled={submitting} className="landing-btn landing-btn--primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="landing-cta-banner">
        <h2 className="landing-cta-banner__title">Ready to get started?</h2>
        <p className="landing-cta-banner__subtitle">
          Join businesses already using StockPilot to streamline their operations.
        </p>
        <div className="landing-cta-banner__actions">
          <Link to="/register" className="landing-btn landing-btn--cta">Create Account</Link>
          <Link to="/login" className="landing-btn landing-btn--ghost">Log In</Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} StockPilot — Inventory Avengers. All rights reserved.</p>
      </footer>
    </div>
  );
}
