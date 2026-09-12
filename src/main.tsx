// /home/user/projects/studioxlam/src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';
import { installVitePreloadReload } from './utils/lazyWithRetry';
import './index.css';

installVitePreloadReload();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);

// Используем import.meta.env для Vite
const isDevelopment = import.meta.env.DEV ||
                     import.meta.env.MODE === 'development' ||
                     window.location.hostname === 'localhost' ||
                     window.location.hostname.includes('127.0.0.1');

if (isDevelopment) {
  console.log('🚀 Development mode: StrictMode enabled');
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
} else {
  console.log('🏭 Production mode: StrictMode disabled');
  root.render(
    <Provider store={store}>
      <App />
    </Provider>
  );
}