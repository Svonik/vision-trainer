import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { isDisclaimerAccepted } from './modules/storage';
import { DisclaimerGuard } from './guards/DisclaimerGuard';
import { CalibrationGuard } from './guards/CalibrationGuard';
import { GameSettingsGuard } from './guards/GameSettingsGuard';
import { DisclaimerPage } from './pages/DisclaimerPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { GameSelectPage } from './pages/GameSelectPage';
import { SettingsPage } from './pages/SettingsPage';
import { GamePage } from './pages/GamePage';
import { StatsPage } from './pages/StatsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={
                    <Navigate to={isDisclaimerAccepted() ? '/games' : '/disclaimer'} replace />
                } />
                <Route path="/disclaimer" element={<DisclaimerPage />} />
                <Route path="/calibration" element={
                    <DisclaimerGuard><CalibrationPage /></DisclaimerGuard>
                } />
                <Route path="/games" element={
                    <DisclaimerGuard><CalibrationGuard><GameSelectPage /></CalibrationGuard></DisclaimerGuard>
                } />
                <Route path="/games/:gameId/settings" element={
                    <DisclaimerGuard><CalibrationGuard><SettingsPage /></CalibrationGuard></DisclaimerGuard>
                } />
                <Route path="/games/:gameId/play" element={
                    <DisclaimerGuard><CalibrationGuard><GameSettingsGuard><GamePage /></GameSettingsGuard></CalibrationGuard></DisclaimerGuard>
                } />
                <Route path="/games/:gameId/stats" element={<StatsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
