import { HashRouter, Routes, Route, Navigate } from 'react-router';
import { isDisclaimerAccepted, getCalibration } from './modules/storage';
import { DisclaimerGuard } from './guards/DisclaimerGuard';
import { CalibrationGuard } from './guards/CalibrationGuard';
import { GameSettingsGuard } from './guards/GameSettingsGuard';
import { Layout } from './components/Layout';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { GameSelectPage } from './pages/GameSelectPage';
import { SettingsPage } from './pages/SettingsPage';
import { GamePage } from './pages/GamePage';
import { StatsPage } from './pages/StatsPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsHub } from './pages/SettingsHub';
import { ModeSelectPage } from './pages/ModeSelectPage';
import { TrainingSettingsPage } from './pages/TrainingSettingsPage';
import { TrainingPlayPage } from './pages/TrainingPlayPage';
import { TrainingSummaryPage } from './pages/TrainingSummaryPage';

function isOnboardingComplete() {
    return isDisclaimerAccepted() && getCalibration().suppression_passed;
}

function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/onboarding" element={<OnboardingWizard />} />
                <Route path="/games/:gameId/play" element={
                    <DisclaimerGuard><CalibrationGuard><GameSettingsGuard><GamePage /></GameSettingsGuard></CalibrationGuard></DisclaimerGuard>
                } />
                <Route path="/training/play" element={
                    <DisclaimerGuard><CalibrationGuard><TrainingPlayPage /></CalibrationGuard></DisclaimerGuard>
                } />
                <Route path="/*" element={
                    <Layout>
                        <Routes>
                            <Route path="/" element={
                                <Navigate to={isOnboardingComplete() ? '/mode-select' : '/onboarding'} replace />
                            } />
                            <Route path="/mode-select" element={
                                <DisclaimerGuard><CalibrationGuard><ModeSelectPage /></CalibrationGuard></DisclaimerGuard>
                            } />
                            <Route path="/games" element={
                                <DisclaimerGuard><CalibrationGuard><GameSelectPage /></CalibrationGuard></DisclaimerGuard>
                            } />
                            <Route path="/games/:gameId/settings" element={
                                <DisclaimerGuard><CalibrationGuard><SettingsPage /></CalibrationGuard></DisclaimerGuard>
                            } />
                            <Route path="/games/:gameId/stats" element={<StatsPage />} />
                            <Route path="/training/settings" element={
                                <DisclaimerGuard><CalibrationGuard><TrainingSettingsPage /></CalibrationGuard></DisclaimerGuard>
                            } />
                            <Route path="/training/summary" element={<TrainingSummaryPage />} />
                            <Route path="/progress" element={<ProgressPage />} />
                            <Route path="/settings" element={<SettingsHub />} />
                        </Routes>
                    </Layout>
                } />
            </Routes>
        </HashRouter>
    );
}

export default App;
