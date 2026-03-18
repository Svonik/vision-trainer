import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    onReset: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class PhaserErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('PhaserErrorBoundary caught:', error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#000',
                        color: 'var(--text)',
                        fontFamily: 'Fredoka, system-ui, sans-serif',
                        textAlign: 'center',
                        padding: '24px',
                    }}
                >
                    <div>
                        <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>
                            Игра не загрузилась
                        </h2>
                        <p
                            style={{
                                color: 'var(--text-secondary)',
                                marginBottom: '20px',
                                fontSize: '14px',
                            }}
                        >
                            {this.state.error?.message ||
                                'Произошла ошибка при загрузке игры'}
                        </p>
                        <button
                            type="button"
                            onClick={this.handleRetry}
                            style={{
                                background: 'var(--cta)',
                                color: 'var(--cta-text)',
                                border: 'none',
                                borderRadius: '999px',
                                padding: '12px 32px',
                                fontSize: '16px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Попробовать снова
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
