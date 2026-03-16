import { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg, #12101a)',
                    color: 'var(--text, #e8e0f0)',
                    fontFamily: 'Fredoka, system-ui, sans-serif',
                    textAlign: 'center',
                    padding: '24px',
                }}>
                    <div>
                        <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Что-то пошло не так</h1>
                        <p style={{ color: 'var(--text-secondary, #8b7fa0)', marginBottom: '20px' }}>
                            {this.state.error?.message || 'Произошла ошибка'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: 'var(--cta, #ff9f43)',
                                color: 'var(--cta-text, #12101a)',
                                border: 'none',
                                borderRadius: '999px',
                                padding: '12px 32px',
                                fontSize: '16px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Обновить страницу
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
