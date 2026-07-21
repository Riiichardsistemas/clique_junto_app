import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import AdminRoute from './components/layout/AdminRoute.jsx';
import PageLoader from './components/ui/PageLoader.jsx';
import { useAuth } from './contexts/AuthContext.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const AccountSettings = lazy(() => import('./pages/AccountSettings.jsx'));
const NewEvent = lazy(() => import('./pages/events/NewEvent.jsx'));
const EventDashboard = lazy(() => import('./pages/events/EventDashboard.jsx'));
const EventAlbum = lazy(() => import('./pages/events/EventAlbum.jsx'));
const Checkout = lazy(() => import('./pages/events/Checkout.jsx'));
const EventCustomize = lazy(() => import('./pages/events/EventCustomize.jsx'));
const GuestEntry = lazy(() => import('./pages/guest/GuestEntry.jsx'));
const Camera = lazy(() => import('./pages/guest/Camera.jsx'));
const Album = lazy(() => import('./pages/guest/Album.jsx'));
const Telao = lazy(() => import('./pages/telao/Telao.jsx'));
const MyAlbums = lazy(() => import('./pages/guest/MyAlbums.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents.jsx'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments.jsx'));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit.jsx'));
const AdminSystem = lazy(() => import('./pages/admin/AdminSystem.jsx'));
const AdminAccount = lazy(() => import('./pages/admin/AdminAccount.jsx'));

function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader label="Verificando sua sessão" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

function RouteEffects() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        containerStyle={{ top: 'max(12px, env(safe-area-inset-top))', left: 12, right: 12 }}
        toastOptions={{
          style: {
            background: 'rgba(24,24,27,0.94)',
            color: '#F7F3EB',
            border: '1px solid rgba(255,255,255,0.13)',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '16px',
            padding: '13px 18px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 24px 70px -24px rgba(0,0,0,0.9)',
            maxWidth: 'min(420px, calc(100vw - 24px))',
          },
          success: { iconTheme: { primary: '#4ADE80', secondary: '#09090A' } },
          error:   { iconTheme: { primary: '#F87171', secondary: '#09090A' } },
        }}
      />
      <RouteEffects />
      <Suspense fallback={<PageLoader />}>
        <Routes>
        <Route path="/"                 element={<RoleHome />} />
        <Route path="/login"            element={<Login />} />
        <Route path="/register"         element={<Register />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/reset-password"   element={<ResetPassword />} />
        <Route path="/dashboard"        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/account"          element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
        <Route path="/events/new"       element={<ProtectedRoute><NewEvent /></ProtectedRoute>} />
        <Route path="/events/:id"       element={<ProtectedRoute><EventDashboard /></ProtectedRoute>} />
        <Route path="/events/:id/album" element={<ProtectedRoute><EventAlbum /></ProtectedRoute>} />
        <Route path="/events/:id/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/events/:id/personalizar" element={<ProtectedRoute><EventCustomize /></ProtectedRoute>} />
        <Route path="/e/:slug"          element={<GuestEntry />} />
        <Route path="/e/:slug/camera"   element={<Camera />} />
        <Route path="/e/:slug/album"    element={<Album />} />
        <Route path="/telao/:key"       element={<Telao />} />
        <Route path="/albuns"           element={<ProtectedRoute><MyAlbums /></ProtectedRoute>} />

        {/* Painel super-admin */}
        <Route path="/admin"          element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/vendas"   element={<AdminRoute><AdminPayments /></AdminRoute>} />
        <Route path="/admin/usuarios" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/eventos"  element={<AdminRoute><AdminEvents /></AdminRoute>} />
        <Route path="/admin/auditoria" element={<AdminRoute><AdminAudit /></AdminRoute>} />
        <Route path="/admin/sistema"   element={<AdminRoute><AdminSystem /></AdminRoute>} />
        <Route path="/admin/conta"     element={<AdminRoute><AdminAccount /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
