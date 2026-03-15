import { Navigate, useLocation, useParams } from 'react-router';

export function GameSettingsGuard({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const { gameId } = useParams();
    if (!location.state?.settings) {
        return <Navigate to={`/games/${gameId}/settings`} replace />;
    }
    return <>{children}</>;
}
