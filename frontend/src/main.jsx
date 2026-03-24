import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './styles/common.css';
import './styles/auth.css';
import './styles/layout.css';
import './styles/ui.css';
import './styles/pages.css';
import './styles/remaining-pages.css';

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
document.body.style.backgroundColor = savedTheme === 'dark' ? '#0F1117' : '#F8F9FA';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
