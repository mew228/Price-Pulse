import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const PLATFORMS = [
  { name: 'Amazon', placeholder: 'https://www.amazon.in/dp/...', pattern: 'amazon' },
  { name: 'Flipkart', placeholder: 'https://www.flipkart.com/...', pattern: 'flipkart' },
  { name: 'Myntra', placeholder: 'https://www.myntra.com/...', pattern: 'myntra' },
];

const detectPlatformHint = (url) => {
  const lower = url.toLowerCase();
  if (lower.includes('amazon')) return 'amazon';
  if (lower.includes('flipkart')) return 'flipkart';
  if (lower.includes('myntra')) return 'myntra';
  return null;
};

const getPlatformEmoji = (p) => {
  const map = { amazon: '🟠', flipkart: '🔵', myntra: '🔴' };
  return map[p] || '';
};

const initialForm = {
  url: '',
  targetPrice: '',
  userEmail: '',
  userPhone: '',
  notifyEmail: true,
  notifySMS: false,
};

const initialErrors = {};

export default function TrackerForm({ onTrackerAdded, onFilterEmail }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState(initialErrors);
  const [loading, setLoading] = useState(false);
  const [filterEmail, setFilterEmail] = useState('');
  const [platformHint, setPlatformHint] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm((f) => ({ ...f, [name]: val }));
    setErrors((err) => ({ ...err, [name]: '' }));
    if (name === 'url') setPlatformHint(detectPlatformHint(value));
  };

  const validate = () => {
    const errs = {};
    if (!form.url.trim()) errs.url = 'Product URL is required';
    else if (!/^https?:\/\/.+/i.test(form.url)) errs.url = 'Must be a valid URL starting with http(s)';
    else if (!['amazon', 'flipkart', 'myntra'].includes(detectPlatformHint(form.url)))
      errs.url = 'Only Amazon, Flipkart, and Myntra URLs are supported';

    if (!form.targetPrice) errs.targetPrice = 'Target price is required';
    else if (isNaN(form.targetPrice) || Number(form.targetPrice) <= 0)
      errs.targetPrice = 'Must be a positive number';

    if (!form.userEmail.trim()) errs.userEmail = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.userEmail)) errs.userEmail = 'Invalid email address';

    if (form.notifySMS && form.userPhone && !/^\+?[1-9]\d{9,14}$/.test(form.userPhone.replace(/\s/g, '')))
      errs.userPhone = 'Include country code (e.g. +919876543210)';

    if (!form.notifyEmail && !form.notifySMS)
      errs.notify = 'At least one notification method must be selected';

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fix the highlighted errors');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        url: form.url.trim(),
        targetPrice: Number(form.targetPrice),
        userEmail: form.userEmail.trim().toLowerCase(),
        userPhone: form.userPhone.trim() || null,
        notifyEmail: form.notifyEmail,
        notifySMS: form.notifySMS,
      };

      const { data } = await axios.post('/api/trackers', payload);
      if (data.success) {
        toast.success('TRACKER ADDED. Price will be fetched shortly.');
        setForm(initialForm);
        setPlatformHint(null);
        setErrors({});
        onTrackerAdded();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to add tracker';
      toast.error(msg);
      if (err.response?.data?.errors) {
        const apiErrors = {};
        err.response.data.errors.forEach((e) => { apiErrors[e.path] = e.msg; });
        setErrors(apiErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    onFilterEmail(filterEmail.toLowerCase().trim());
    if (filterEmail) toast(`Showing trackers for: ${filterEmail}`, { icon: '' });
    else toast('Showing all trackers', { icon: '' });
  };

  const urlPlaceholder = platformHint
    ? PLATFORMS.find((p) => p.pattern === platformHint)?.placeholder
    : 'Paste Amazon, Flipkart or Myntra product URL...';

  return (
    <section className="form-section">
      <p className="form-section-title">ADD NEW PRICE TRACKER</p>
      <div className="tracker-form-card">
        <form onSubmit={handleSubmit} noValidate id="tracker-form">
          <div className="form-grid">
            <div className="form-group form-col-full">
              <label className="form-label" htmlFor="url">
                Product URL
                {platformHint && (
                  <span style={{ marginLeft: 8, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, fontSize: '10px' }}>
                    [{platformHint} detected]
                  </span>
                )}
              </label>
              <input
                id="url"
                name="url"
                type="url"
                className={`nm-input ${errors.url ? 'error' : ''}`}
                placeholder={urlPlaceholder}
                value={form.url}
                onChange={handleChange}
                autoComplete="off"
              />
              {errors.url && <span className="input-error-msg">⚠ {errors.url}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="targetPrice">Target Price (₹)</label>
              <input
                id="targetPrice"
                name="targetPrice"
                type="number"
                min="1"
                step="0.01"
                className={`nm-input ${errors.targetPrice ? 'error' : ''}`}
                placeholder="e.g. 1999"
                value={form.targetPrice}
                onChange={handleChange}
              />
              {errors.targetPrice && <span className="input-error-msg">⚠ {errors.targetPrice}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="userEmail">Your Email</label>
              <input
                id="userEmail"
                name="userEmail"
                type="email"
                className={`nm-input ${errors.userEmail ? 'error' : ''}`}
                placeholder="you@example.com"
                value={form.userEmail}
                onChange={handleChange}
                autoComplete="email"
              />
              {errors.userEmail && <span className="input-error-msg">⚠ {errors.userEmail}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="userPhone">Phone (for SMS, optional)</label>
              <input
                id="userPhone"
                name="userPhone"
                type="tel"
                className={`nm-input ${errors.userPhone ? 'error' : ''}`}
                placeholder="+919876543210"
                value={form.userPhone}
                onChange={handleChange}
                autoComplete="tel"
              />
              {errors.userPhone && <span className="input-error-msg">⚠ {errors.userPhone}</span>}
            </div>

            <div className="form-group form-col-full">
              <label className="form-label">Notify me via</label>
              <div className="nm-checkbox-group">
                <label className="nm-checkbox-label" htmlFor="notifyEmail">
                  <input
                    id="notifyEmail"
                    name="notifyEmail"
                    type="checkbox"
                    checked={form.notifyEmail}
                    onChange={handleChange}
                  />
                  EMAIL
                </label>
                <label className="nm-checkbox-label" htmlFor="notifySMS">
                  <input
                    id="notifySMS"
                    name="notifySMS"
                    type="checkbox"
                    checked={form.notifySMS}
                    onChange={handleChange}
                  />
                  SMS (TWILIO)
                </label>
              </div>
              {errors.notify && <span className="input-error-msg">⚠ {errors.notify}</span>}
            </div>
          </div>

          <div className="form-submit-row" style={{ marginTop: 24 }}>
            <button
              type="submit"
              id="submit-tracker-btn"
              className="nm-btn nm-btn-primary"
              disabled={loading}
            >
              {loading ? 'ADDING TRACKER...' : 'START TRACKING'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px solid var(--border)' }}>
          <p className="form-section-title" style={{ marginBottom: 12 }}>FILTER MY TRACKERS</p>
          <form onSubmit={handleFilterSubmit} className="filter-bar" id="filter-form">
            <div className="filter-input-wrap">
              <span className="filter-icon">{'>'}</span>
              <input
                id="filter-email"
                type="email"
                className="nm-input"
                placeholder="Filter by email address..."
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <button type="submit" id="filter-btn" className="nm-btn nm-btn-ghost">Filter</button>
            {filterEmail && (
              <button
                type="button"
                id="clear-filter-btn"
                className="nm-btn nm-btn-ghost"
                onClick={() => { setFilterEmail(''); onFilterEmail(''); }}
              >
                Clear
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
