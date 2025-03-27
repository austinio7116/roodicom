import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Or whatever your main component is
import './styles/index.css'; // If applicable

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);