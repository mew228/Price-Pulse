import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import TrackerForm from './components/TrackerForm';
import ProductList from './components/ProductList';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterEmail, setFilterEmail] = useState('');

  const handleTrackerAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="app-wrapper">
      <Header />
      <main className="main-content">
        <TrackerForm onTrackerAdded={handleTrackerAdded} onFilterEmail={setFilterEmail} />
        <ProductList key={refreshKey} filterEmail={filterEmail} />
      </main>
      <footer className="app-footer">
        <p>Built with care by PricePulse • Tracking prices across Amazon, Flipkart & Myntra</p>
      </footer>
    </div>
  );
}
