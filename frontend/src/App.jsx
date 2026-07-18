import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { MainLayout } from './components/layout/MainLayout';
import { Spinner } from './components/common/Spinner';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage })));
const ProjectsPage = lazy(() => import('./pages/Projects').then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('./pages/Projects').then((m) => ({ default: m.ProjectDetailPage })));
const TasksPage = lazy(() => import('./pages/Tasks').then((m) => ({ default: m.TasksPage })));
const CodeEditorPage = lazy(() => import('./pages/CodeEditor').then((m) => ({ default: m.CodeEditorPage })));
const LogsPage = lazy(() => import('./pages/Logs').then((m) => ({ default: m.LogsPage })));
const MetricsPage = lazy(() => import('./pages/Metrics').then((m) => ({ default: m.MetricsPage })));
const NotificationsPage = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.NotificationsPage })));

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const AppRoutes = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/tasks" element={<TasksPage />} />
          <Route path="/projects/:id/code" element={<CodeEditorPage />} />
          <Route path="/projects/:id/logs" element={<LogsPage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </WebSocketProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
