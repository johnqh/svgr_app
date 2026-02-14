import React from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from './config/initialize';
import App from './App';
import './index.css';

initializeApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
