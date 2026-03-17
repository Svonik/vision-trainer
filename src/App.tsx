import { lazy, Suspense, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { isDisclaimerAccepted, getCalibration } from './modules/storage';
import { DisclaimerGuard } from './guards/DisclaimerGuard';
import { CalibrationGuard } from './guards/CalibrationGuard';
import { GameSettingsGuard } from './guards/GameSettingsGuard';
import { Layout } from './components/Layout';
import { SuspenseFallback } from './components/SuspenseFallback';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/PageTransition';
import { Toaster } from 'sonner';

const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const GameSelectPage = lazy(() => import('./pages/GameSelectPage').then(m => ({ default: m.GameSelectPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const GamePage = lazy(() => import('./pages/GamePage').then(m => ({ default: m.GamePage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then(m => ({ default: m.StatsPage })));
const ProgressPage = lazy(() => import('./pages/ProgressPage').then(m => ({ default: m.ProgressPage })));
const SettingsHub = lazy(() => import('./pages/SettingsHub').then(m => ({ default: m.SettingsHub })));
const ModeSelectPage = lazy(() => import('./pages/ModeSelectPage').then(m => ({ default: m.ModeSelectPage })));
const TrainingSettingsPage = lazy(() => import('./pages/TrainingSettingsPage').then(m => ({ default: m.TrainingSettingsPage })));
const TrainingPlayPage = lazy(() => import('./pages/TrainingPlayPage').then(m => ({ default: m.TrainingPlayPage })));
const TrainingSummaryPage = lazy(() => import('./pages/TrainingSummaryPage').then(m => ({ default: m.TrainingSummaryPage })));

function isOnboardingComplete() {
    return isDisclaimerAccepted() && getCalibration().suppression_passed;
}

function InnerRoutes() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <PageTransition key={location.key}>
                <Routes location={location}>
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
            </PageTransition>
        </AnimatePresence>
    );
}

function App() {
    const [onboarded] = useState(() => isOnboardingComplete());

    return (
        <HashRouter>
            <Suspense fallback={<SuspenseFallback />}>
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
                            <InnerRoutes />
                        </Layout>
                    } />
                </Routes>
            </Suspense>
            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                    },
                }}
            />
        </HashRouter>
    );
}

export default App;
