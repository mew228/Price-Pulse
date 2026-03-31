import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Header() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get('/api/stats');
        if (data.success) setStats(data.data);
      } catch {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <a className="header-brand" href="/">
        <div className="header-logo">●</div>
        <div>
          <div className="header-title">PricePulse</div>
          <div className="header-subtitle">Smart Price Drop Tracker</div>
        </div>
      </a>
      {stats && (
        <div className="header-stats">
          <div className="header-stat-pill">
            <span>{stats.active}</span> Active Trackers
          </div>
          <div className="header-stat-pill">
            <span>{stats.notified}</span> Alerts Sent
          </div>
        </div>
      )}
    </header>
  );
}
