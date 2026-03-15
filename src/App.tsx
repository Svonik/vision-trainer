import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { isDisclaimerAccepted } from './modules/storage';
import { DisclaimerGuard } from './guards/DisclaimerGuard';
import { CalibrationGuard } from './guards/CalibrationGuard';
import { GameSettingsGuard } from './guards/GameSettingsGuard';
import { DisclaimerPage } from './pages/DisclaimerPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { GameSelectPage } from './pages/GameSelectPage';

const Placeholder = ({ name }: { name: string }) => <div><h1>{name}</h1></div>;

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
                    <DisclaimerGuard><CalibrationGuard><Placeholder name="Settings" /></CalibrationGuard></DisclaimerGuard>
                } />
                <Route path="/games/:gameId/play" element={
                    <DisclaimerGuard><CalibrationGuard><GameSettingsGuard><Placeholder name="Game" /></GameSettingsGuard></CalibrationGuard></DisclaimerGuard>
                } />
                <Route path="/games/:gameId/stats" element={<Placeholder name="Stats" />} />
                <Route path="/profile" element={<Placeholder name="Profile" />} />
                <Route path="/dashboard" element={<Placeholder name="Dashboard" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
