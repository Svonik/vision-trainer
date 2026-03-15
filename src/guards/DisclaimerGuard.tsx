import { Navigate } from 'react-router';
import { isDisclaimerAccepted } from '../modules/storage';

export function DisclaimerGuard({ children }: { children: React.ReactNode }) {
    if (!isDisclaimerAccepted()) {
        return <Navigate to="/disclaimer" replace />;
    }
    return <>{children}</>;
}
