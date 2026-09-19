import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TalentOSProvider } from './context/TalentOSContext';
import { RequireAuth, RequireRole, RedirectIfAuth } from './components/RouteGuards';

import LoginPage from './pages/auth/LoginPage';
import CandidateShell from './components/CandidateShell';
import AdminShell from './components/AdminShell';

// Candidate pages
import CandidateDashboard from './pages/candidate/DashboardPage';
import ApplyPage from './pages/candidate/ApplyPage';
import {
  CandidateProfile,
  CandidateAssessments,
  CandidateInterviews,
  CandidateDocuments,
  CandidateNotifications,
  CandidateSettings
} from './pages/PlaceholderPages';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPipeline from './pages/admin/AdminPipeline';
import AdminCandidates from './pages/admin/AdminCandidates';
import CandidateDetail from './pages/admin/CandidateDetail';
import {
  AdminApplications,
  AdminAssessments,
  AdminInterviews,
  AdminHired,
  AdminRejected,
  AdminDocuments,
  AdminAnalytics,
  AdminSettings
} from './pages/PlaceholderPages';

import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <TalentOSProvider>
        <BrowserRouter>
          <Routes>
            {/* Public / Auth */}
            <Route
              path="/login"
              element={
                <RedirectIfAuth>
                  <LoginPage />
                </RedirectIfAuth>
              }
            />

            {/* Candidate Portal */}
            <Route
              path="/candidate"
              element={
                <RequireRole role="CANDIDATE">
                  <CandidateShell />
                </RequireRole>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<CandidateDashboard />} />
              <Route path="apply" element={<ApplyPage />} />
              <Route path="profile" element={<CandidateProfile />} />
              <Route path="assessments" element={<CandidateAssessments />} />
              <Route path="interviews" element={<CandidateInterviews />} />
              <Route path="documents" element={<CandidateDocuments />} />
              <Route path="notifications" element={<CandidateNotifications />} />
              <Route path="settings" element={<CandidateSettings />} />
            </Route>

            {/* Admin Portal */}
            <Route
              path="/admin"
              element={
                <RequireRole role="ADMIN">
                  <AdminShell />
                </RequireRole>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="pipeline" element={<AdminPipeline />} />
              <Route path="candidates" element={<AdminCandidates />} />
              <Route path="candidates/:id" element={<CandidateDetail />} />
              <Route path="applications" element={<AdminApplications />} />
              <Route path="assessments" element={<AdminAssessments />} />
              <Route path="interviews" element={<AdminInterviews />} />
              <Route path="hired" element={<AdminHired />} />
              <Route path="rejected" element={<AdminRejected />} />
              <Route path="documents" element={<AdminDocuments />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Default Catch-all */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </TalentOSProvider>
    </AuthProvider>
  );
}
