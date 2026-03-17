import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
            <Toaster
                theme="dark"
                position="top-center"
                toastOptions={{
                    style: {
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                    },
                }}
            />
        </ErrorBoundary>
    </React.StrictMode>,
)
