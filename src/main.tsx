// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';        // <-- not ../App
import './index.css';

const el = document.getElementById('root')!;
createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
