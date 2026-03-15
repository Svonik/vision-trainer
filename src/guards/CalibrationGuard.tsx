import { Navigate } from 'react-router';
import { getCalibration } from '../modules/storage';

export function CalibrationGuard({ children }: { children: React.ReactNode }) {
    const calibration = getCalibration();
    if (!calibration.suppression_passed) {
        return <Navigate to="/calibration" replace />;
    }
    return <>{children}</>;
}
