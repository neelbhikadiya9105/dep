/**
 * Email service — sends transactional emails.
 * Uses Nodemailer with SMTP (configured via environment variables).
 * Gracefully skips sending if SMTP is not configured.
 */
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const port = parseInt(SMTP_PORT || '587', 10);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/**
 * sendEmail({ to, subject, html, text })
 * Resolves silently if SMTP is not configured.
 */
async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[email] SMTP not configured — skipping: ${subject} → ${to}`);
    return;
  }
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error('[email] Send failed:', err.message);
  }
}

// ── Template helpers ──────────────────────────────────────────────────────────

function trialExpiryEmail(ownerName, daysLeft) {
  const urgency = daysLeft === 0
    ? 'Your trial has ended. Upgrade to restore access.'
    : `Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — upgrade to keep access.`;
  return {
    subject: `StockPilot: ${urgency}`,
    html: `<p>Hi ${ownerName},</p><p>${urgency}</p><p>Log in to your StockPilot dashboard to upgrade your plan.</p>`,
    text: `Hi ${ownerName},\n\n${urgency}\n\nLog in to your StockPilot dashboard to upgrade your plan.`,
  };
}

function paymentFailedEmail(ownerName) {
  return {
    subject: 'StockPilot: Payment failed',
    html: `<p>Hi ${ownerName},</p><p>Your payment failed. Please update your billing details to continue using StockPilot.</p>`,
    text: `Hi ${ownerName},\n\nYour payment failed. Please update your billing details.`,
  };
}

function shopSuspendedEmail(ownerName) {
  return {
    subject: 'StockPilot: Your shop has been suspended',
    html: `<p>Hi ${ownerName},</p><p>Your shop has been suspended. Please contact support to resolve this.</p>`,
    text: `Hi ${ownerName},\n\nYour shop has been suspended. Please contact support.`,
  };
}

module.exports = { sendEmail, trialExpiryEmail, paymentFailedEmail, shopSuspendedEmail };
