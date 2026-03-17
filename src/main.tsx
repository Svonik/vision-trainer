import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isStorageAvailable } from './modules/storage';
import { toast } from 'sonner';
import { t } from './modules/i18n';

// Check localStorage availability
if (!isStorageAvailable()) {
    // Toast will appear after Toaster mounts in App
    setTimeout(() => {
        toast.warning(t('storage.unavailable'), { duration: Infinity });
    }, 1000);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
);
