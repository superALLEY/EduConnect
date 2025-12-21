import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import '../styles/globals.css';
import { initPerformanceOptimizations } from './utils/performanceOptimizations';

// Initialize performance optimizations before rendering
initPerformanceOptimizations();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);