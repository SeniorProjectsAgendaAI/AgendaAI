// frontend/src/index.tsx
// Author: Ankush Joshi + theme wrapping by Alex
// This file initializes the React application and configures AWS Amplify 

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext'; // <-- ADDED THIS

import outputs from './amplify_outputs.json';

Amplify.configure(outputs);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>  
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();