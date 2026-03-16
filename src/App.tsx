import { HashRouter, Routes, Route, Navigate } from 'react-router';
import { useState } from 'react';
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
import { Layout } from './components/Layout';
import { GameTimerContext } from './components/GameTimerContext';

function App() {
    const [elapsedMs, setElapsedMs] = useState<number | null>(null);

    return (
        <GameTimerContext.Provider value={{ elapsedMs }}>
            <HashRouter>
                <Routes>
                    <Route path="/*" element={
                        <Layout>
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
                                    <DisclaimerGuard><CalibrationGuard><GameSettingsGuard><GamePage setElapsedMs={setElapsedMs} /></GameSettingsGuard></CalibrationGuard></DisclaimerGuard>
                                } />
                                <Route path="/games/:gameId/stats" element={<StatsPage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                                <Route path="/dashboard" element={<DashboardPage />} />
                            </Routes>
                        </Layout>
                    } />
                </Routes>
            </HashRouter>
        </GameTimerContext.Provider>
    );
}

export default App;
