import { Navigate, useLocation } from 'react-router';

export function TrainingSettingsGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const location = useLocation();
    if (!location.state?.settings || !location.state?.sessionGames) {
        return <Navigate to="/training/settings" replace />;
    }
    return <>{children}</>;
}
