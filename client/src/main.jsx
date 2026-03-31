import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#000',
          border: '2px solid #000',
          borderRadius: '0px',
          fontSize: '13px',
          fontWeight: '700',
          padding: '12px 16px',
          textTransform: 'uppercase',
        },
        success: { iconTheme: { primary: '#000', secondary: '#fff' } },
        error: { iconTheme: { primary: '#000', secondary: '#fff' } },
      }}
    />
    <App />
  </React.StrictMode>
);
