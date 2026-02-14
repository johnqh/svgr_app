import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from './config/initialize';
import App from './App';
import './i18n';
import './index.css';

initializeApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </React.StrictMode>,
);
