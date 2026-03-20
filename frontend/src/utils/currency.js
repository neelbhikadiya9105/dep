// Currency code to locale mapping for better number formatting
const CURRENCY_LOCALES = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  CAD: 'en-CA',
};

/**
 * Format a number as a currency string.
 * @param {number} amount
 * @param {string} currencyCode - ISO 4217 currency code (e.g. 'INR', 'USD')
 * @returns {string}
 */
export function formatCurrency(amount, currencyCode = 'INR') {
  const code = currencyCode || 'INR';
  const locale = CURRENCY_LOCALES[code] || 'en-US';
  return Number(amount || 0).toLocaleString(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
