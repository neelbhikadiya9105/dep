import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Apply saved theme before first render to prevent flash
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
// Set body background immediately so there is no white flash before CSS loads.
// These values must match --bg-base in index.css; CSS custom properties are not
// yet available at this point (the stylesheet hasn't been parsed).
document.body.style.backgroundColor = savedTheme === 'dark' ? '#0F1117' : '#F8F9FA';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
