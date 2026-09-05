import React from 'react';
import ReactDOM from 'react-dom/client';
import Providers from './app/providers.jsx';
import Router from './app/router.jsx';
import './styles/main.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Providers>
      <Router />
    </Providers>
  </React.StrictMode>
);
