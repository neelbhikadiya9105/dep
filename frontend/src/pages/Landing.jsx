import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiBarChart2, FiBox, FiCornerUpLeft, FiShoppingCart } from 'react-icons/fi';
import { apiPost, apiGet } from '../api/axios.js';
import LandingHeader from '../components/landing/LandingHeader.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';
import '../styles/landing-page.css';

const FEATURES = [
  {
    icon: FiBox,
    colorClass: 'landing-feature-card__icon--indigo',
    title: 'Smart Inventory',
    desc: 'Track stock levels in real time with barcode scanning, low-stock alerts, and multi-store support.',
  },
  {
    icon: FiShoppingCart,
    colorClass: 'landing-feature-card__icon--blue',
    title: 'Point of Sale',
    desc: 'Fast POS checkout with cash, card, and UPI payments. Barcode scanning built in.',
  },
  {
    icon: FiBarChart2,
    colorClass: 'landing-feature-card__icon--green',
    title: 'Reports and Analytics',
    desc: 'Revenue summaries, profit margins, and transaction reports exportable as PDF or CSV.',
  },
  {
    icon: FiCornerUpLeft,
    colorClass: 'landing-feature-card__icon--orange',
    title: 'Returns Management',
    desc: 'Process returns with automatic restock logic based on return reason.',
  },
];

const STEPS = [
  { title: 'Request Access', desc: 'Submit your details using the form below and our team will review it.' },
  { title: 'Get Approved', desc: 'Our platform admin approves your request and sets up your store.' },
  { title: 'Configure', desc: 'Add your products, set up staff accounts, and customize settings.' },
  { title: 'Go Live', desc: 'Start processing sales, tracking inventory, and viewing reports.' },
];

const PREVIEW_CARDS = [
  { label: 'Monthly Revenue', value: 'INR 1,24,500' },
  { label: "Today's Orders", value: '38' },
  { label: 'Total Products', value: '284' },
  { label: 'Low Stock Items', value: '7' },
];

const PREVIEW_BARS = [40, 65, 45, 80, 55, 90, 70, 95, 60, 75, 85, 50];

export default function Landing() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    businessName: '',
    message: '',
    password: '',
    confirmPassword: '',
    storeId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [stores, setStores] = useState([]);

  useEffect(() => {
    apiGet('/stores/public')
      .then((data) => {
        const storeList = Array.isArray(data) ? data : data.data || [];
        setStores(storeList);
      })
      .catch(() => setStores([]));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.password) {
      setError('Password is required.');
      return;
    }

    if (form.password.length < 8 || !/\d/.test(form.password)) {
      setError('Password must be at least 8 characters and contain at least one number.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

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
      <LandingHeader />

      <section className="landing-hero">
        <div className="landing-hero__inner">
          <div className="landing-hero__badge">SaaS Inventory Platform</div>
          <h1 className="landing-hero__title">
            Manage Your Inventory
            <br />
            <span>Like Never Before</span>
          </h1>
          <p className="landing-hero__subtitle">
            StockPilot gives small and medium businesses a powerful, all-in-one inventory,
            POS, and reporting platform without the enterprise price tag.
          </p>
          <div className="landing-hero__ctas">
            <Link to="/register" className="landing-btn landing-btn--cta">Get Started Free</Link>
            <Link to="/login" className="landing-btn landing-btn--outline">Log In to Dashboard</Link>
          </div>
        </div>
      </section>

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
            {FEATURES.map(({ icon: Icon, colorClass, title, desc }) => (
              <div key={title} className="landing-feature-card">
                <div className={`landing-feature-card__icon ${colorClass}`}>
                  <Icon size={22} />
                </div>
                <div className="landing-feature-card__title">{title}</div>
                <div className="landing-feature-card__desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--alt">
        <div className="landing-section__inner">
          <div className="landing-section__header">
            <div className="landing-section__tag">How It Works</div>
            <h2 className="landing-section__title">Up and running in minutes</h2>
          </div>
          <div className="landing-steps">
            {STEPS.map((step, index) => (
              <div key={step.title} className="landing-step">
                <div className="landing-step__number">{index + 1}</div>
                <div className="landing-step__title">{step.title}</div>
                <div className="landing-step__desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__inner">
          <div className="landing-section__header">
            <div className="landing-section__tag">Dashboard Preview</div>
            <h2 className="landing-section__title">Real-time analytics at a glance</h2>
          </div>
          <div className="landing-preview">
            <div className="landing-preview__grid">
              {PREVIEW_CARDS.map((card) => (
                <div key={card.label} className="landing-preview__card">
                  <div className="landing-preview__card-label">{card.label}</div>
                  <div className="landing-preview__card-value">{card.value}</div>
                </div>
              ))}
            </div>
            <div className="landing-preview__chart">
              {PREVIEW_BARS.map((height, index) => (
                <div key={index} className="landing-preview__bar" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--alt">
        <div className="landing-section__inner">
          <div className="landing-section__header">
            <div className="landing-section__tag">Pricing</div>
            <h2 className="landing-section__title">Simple, transparent pricing</h2>
            <p className="landing-section__desc">One flat fee, no hidden charges. Cancel any time.</p>
          </div>
          <div className="landing-pricing__grid">
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
              <Link to="/register" className="landing-btn landing-btn--outline landing-btn--block">
                Start Free Trial
              </Link>
            </div>

            <div className="landing-pricing-card landing-pricing-card--popular">
              <div className="landing-pricing-card__badge">Most Popular</div>
              <div className="landing-pricing-card__plan">Pro</div>
              <div className="landing-pricing-card__price">INR 999</div>
              <div className="landing-pricing-card__period">per month</div>
              <ul className="landing-pricing-card__features">
                <li>Unlimited products</li>
                <li>1 store, multi-staff</li>
                <li>PDF reports and export</li>
                <li>UPI, cash, and card payments</li>
                <li>Priority support</li>
              </ul>
              <a href="#request-access" className="landing-btn landing-btn--primary landing-btn--block">
                Get Started
              </a>
            </div>

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
              <a href="#request-access" className="landing-btn landing-btn--outline landing-btn--block">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

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
              <div className="landing-success-state">
                <div className="landing-success-icon">Success</div>
                <div className="landing-request-form__title">Request Submitted</div>
                <p className="landing-request-form__subtitle">
                  We received your request and will be in touch soon. If you already have an account,
                  you can <Link to="/login"> log in</Link>.
                </p>
              </div>
            ) : (
              <>
                <div className="landing-request-form__title">Request Access</div>
                <p className="landing-request-form__subtitle">Tell us about yourself and your business.</p>
                {error && <div className="landing-alert">{error}</div>}
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
                  {stores.length > 0 && (
                    <div className="landing-form-group">
                      <label>Select Store (optional)</label>
                      <select name="storeId" value={form.storeId} onChange={handleChange}>
                        <option value="">Create a new store</option>
                        {stores.map((store) => (
                          <option key={store._id} value={store._id}>{store.shopName || store.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="landing-form-group">
                    <label>Message (optional)</label>
                    <textarea name="message" value={form.message} onChange={handleChange} placeholder="Tell us more about your needs..." />
                  </div>
                  <div className="landing-form-group">
                    <label>Password *</label>
                    <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Min. 8 characters with at least one number" />
                  </div>
                  <div className="landing-form-group">
                    <label>Confirm Password *</label>
                    <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required placeholder="Re-enter your password" />
                  </div>
                  <button type="submit" disabled={submitting} className="landing-btn landing-btn--primary landing-btn--block landing-form-submit">
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

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

      <LandingFooter />
    </div>
  );
}
