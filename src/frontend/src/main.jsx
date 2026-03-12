import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#0a0a0a', color: '#fff', height: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔥</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: '#999', marginBottom: '2rem', fontSize: '0.9rem' }}>
            {this.state.error ? this.state.error.message : 'Unknown error'}
          </p>
          <button
            onClick={() => { try { localStorage.clear(); } catch(e) {} window.location.replace('/'); }}
            style={{
              background: '#cc0000', color: '#fff', border: 'none',
              padding: '0.75rem 2rem', borderRadius: '8px',
              fontSize: '1rem', cursor: 'pointer'
            }}
          >
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
