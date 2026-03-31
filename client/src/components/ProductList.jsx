import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const formatPrice = (price, currency = '₹') => {
  if (price === null || price === undefined) return 'N/A';
  return `${currency}${Number(price).toLocaleString('en-IN')}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const getPlatformEmoji = (platform) => {
  return '';
};

const getPlatformLabel = (platform) => {
  const map = { amazon: 'Amazon', flipkart: 'Flipkart', myntra: 'Myntra', unknown: 'Unknown' };
  return map[platform] || 'Unknown';
};

const getProgressPercent = (currentPrice, targetPrice, originalPrice) => {
  if (!currentPrice || !targetPrice) return 0;
  const top = originalPrice || currentPrice * 1.2;
  const range = top - targetPrice;
  if (range <= 0) return 100;
  const dropped = top - currentPrice;
  return Math.min(100, Math.max(0, Math.round((dropped / range) * 100)));
};

const getProgressClass = (currentPrice, targetPrice) => {
  if (!currentPrice || !targetPrice) return '';
  if (currentPrice <= targetPrice) return '';
  const ratio = currentPrice / targetPrice;
  if (ratio > 1.5) return 'danger';
  if (ratio > 1.2) return 'warning';
  return '';
};

const Sparkline = ({ history }) => {
  if (!history || history.length < 2) return null;
  const prices = history.slice(-20).map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 200;
  const H = 36;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W;
    const y = H - ((p - min) / range) * (H - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <div className="sparkline-wrap">
      <svg className="sparkline-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke="url(#sparkGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#888" />
            <stop offset="100%" stopColor="#000" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-row">
      <div className="skeleton skeleton-img" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton skeleton-h" style={{ width: '80%' }} />
        <div className="skeleton skeleton-h-sm" style={{ width: '50%' }} />
      </div>
    </div>
    <div className="skeleton-prices">
      <div className="skeleton-price-block" />
      <div className="skeleton-price-block" />
      <div className="skeleton-price-block" />
    </div>
    <div className="skeleton skeleton-h" style={{ width: '100%', height: 8, borderRadius: 10 }} />
  </div>
);

const ProductCard = ({ product, onDelete, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const progress = getProgressPercent(product.currentPrice, product.targetPrice, product.originalPrice);
  const progressClass = getProgressClass(product.currentPrice, product.targetPrice);
  const priceAchieved = product.currentPrice !== null && product.currentPrice <= product.targetPrice;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data } = await axios.post(`/api/trackers/${product._id}/refresh`);
      if (data.success) {
        toast.success(data.message || 'Price refreshed!');
        onRefresh();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Stop tracking "${product.productName}"?`)) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/trackers/${product._id}`);
      toast.success('Tracker removed');
      onDelete(product._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
      setDeleting(false);
    }
  };

  const badgeClass = `card-platform-badge badge-${product.platform}`;

  return (
    <div className="product-card">
      <div className={badgeClass}>
        {getPlatformEmoji(product.platform)} {getPlatformLabel(product.platform)}
      </div>

      <div className="card-img-wrap">
        {product.productImage ? (
          <img
            className="card-img"
            src={product.productImage}
            alt={product.productName}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="card-img-placeholder">
            {getPlatformEmoji(product.platform)}
          </div>
        )}
        <div className="card-name-wrap">
          <p className="card-name">{product.productName || 'Fetching product details...'}</p>
          <a
            className="card-url-link"
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            title={product.url}
          >
            View on {getPlatformLabel(product.platform)} →
          </a>
        </div>
      </div>

      {priceAchieved && (
        <div className="alert-dropped">
          TARGET PRICE HIT. NOTIFICATION SENT TO {product.userEmail}
        </div>
      )}

      <div className="card-prices">
        <div className="price-block">
          <div className="price-block-label">Current</div>
          <div className={`price-block-value current`}>
            {product.currentPrice !== null ? formatPrice(product.currentPrice, product.currency) : '—'}
          </div>
        </div>
        <div className="price-block">
          <div className="price-block-label">Target</div>
          <div className="price-block-value target">{formatPrice(product.targetPrice, product.currency)}</div>
        </div>
        <div className="price-block">
          <div className="price-block-label">MRP</div>
          <div className="price-block-value original">
            {product.originalPrice ? formatPrice(product.originalPrice, product.currency) : '—'}
          </div>
        </div>
      </div>

      {product.currentPrice !== null && (
        <div className="card-progress">
          <div className="progress-labels">
            <span>Price drop progress</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
              {priceAchieved ? 'TARGET HIT' : `${progress}%`}
            </span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${progressClass}`}
              style={{ width: `${priceAchieved ? 100 : progress}%` }}
            />
          </div>
        </div>
      )}

      {product.priceHistory && product.priceHistory.length >= 2 && (
        <Sparkline history={product.priceHistory} />
      )}

      <div className="card-meta">
        <div>
          <div
            className={`card-status-pill ${
              product.notificationSent ? 'status-notified' : product.isActive ? 'status-active' : 'status-inactive'
            }`}
          >
            {product.notificationSent ? '[NOTIFIED]' : product.isActive ? '[ACTIVE]' : '[PAUSED]'}
          </div>
        </div>
        <div className="card-last-checked">
          Last checked: {formatDate(product.lastChecked)}
        </div>
      </div>

      <div className="card-actions">
        <button
          id={`refresh-btn-${product._id}`}
          className="nm-btn nm-btn-refresh"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh price now"
        >
          {refreshing ? 'REFRESHING...' : 'REFRESH'}
        </button>
        <button
          id={`delete-btn-${product._id}`}
          className="nm-btn nm-btn-danger"
          onClick={handleDelete}
          disabled={deleting}
          title="Remove tracker"
        >
          {deleting ? 'REMOVING...' : 'REMOVE'}
        </button>
      </div>
    </div>
  );
};

export default function ProductList({ filterEmail }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (filterEmail) params.email = filterEmail;
      const { data } = await axios.get('/api/trackers', { params });
      if (data.success) {
        setProducts(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load trackers');
    } finally {
      setLoading(false);
    }
  }, [filterEmail]);

  useEffect(() => {
    setCurrentPage(1);
    fetchProducts(1);
  }, [fetchProducts]);

  const handleDelete = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => p._id !== id));
    setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
  }, []);

  const handleRefresh = useCallback(() => {
    fetchProducts(currentPage);
  }, [fetchProducts, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchProducts(page);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  return (
    <section style={{ paddingTop: 16 }}>
      <div className="list-section-header">
        <h2 className="list-section-title" id="trackers-heading">
          My Trackers
          <span>
            {pagination.total > 0
              ? `${pagination.total} product${pagination.total !== 1 ? 's' : ''} tracked`
              : ''}
          </span>
        </h2>
        {!loading && products.length > 0 && (
          <button
            id="refresh-all-btn"
            className="nm-btn nm-btn-ghost"
            onClick={() => fetchProducts(currentPage)}
          >
            REFRESH LIST
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-grid">
          {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.length === 0 ? (
              <div className="empty-state">
                <h3 className="empty-title">
                  {filterEmail ? `No trackers for ${filterEmail}` : 'No trackers yet'}
                </h3>
                <p className="empty-desc">
                  {filterEmail
                    ? 'Try a different email or clear the filter to see all trackers.'
                    : 'Paste a product URL above, set your target price, and start tracking deals!'}
                </p>
              </div>
            ) : (
              products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onDelete={handleDelete}
                  onRefresh={handleRefresh}
                />
              ))
            )}
          </div>

          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  id={`page-btn-${page}`}
                  className="nm-btn"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 0,
                    fontWeight: 800,
                    fontSize: 13,
                    border: '2px solid var(--border)',
                    background: currentPage === page ? 'var(--text-primary)' : 'var(--bg)',
                    color: currentPage === page ? '#fff' : 'var(--text-primary)',
                    cursor: currentPage === page ? 'default' : 'pointer',
                  }}
                  onClick={() => currentPage !== page && handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
