import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AccountSettings from './pages/AccountSettings.jsx';
import NewEvent from './pages/events/NewEvent.jsx';
import EventDashboard from './pages/events/EventDashboard.jsx';
import EventAlbum from './pages/events/EventAlbum.jsx';
import GuestEntry from './pages/guest/GuestEntry.jsx';
import Camera from './pages/guest/Camera.jsx';
import Album from './pages/guest/Album.jsx';
import MyAlbums from './pages/guest/MyAlbums.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';

export default function App() {
  return (
    <>
      {/* Toast escuro no canto superior direito, como nos prints */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(30,30,28,0.92)',
            color: '#F5F1E8',
            border: '1px solid rgba(226,196,143,0.16)',
            fontSize: '14px',
            borderRadius: '14px',
            padding: '12px 18px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 60px -24px rgba(0,0,0,0.8)',
          },
          success: { iconTheme: { primary: '#4ADE80', secondary: '#141519' } },
          error:   { iconTheme: { primary: '#F87171', secondary: '#141519' } },
        }}
      />
      <Routes>
        <Route path="/"                 element={<Navigate to="/login" replace />} />
        <Route path="/login"            element={<Login />} />
        <Route path="/register"         element={<Register />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/reset-password"   element={<ResetPassword />} />
        <Route path="/dashboard"        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/account"          element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
        <Route path="/events/new"       element={<ProtectedRoute><NewEvent /></ProtectedRoute>} />
        <Route path="/events/:id"       element={<ProtectedRoute><EventDashboard /></ProtectedRoute>} />
        <Route path="/events/:id/album" element={<ProtectedRoute><EventAlbum /></ProtectedRoute>} />
        <Route path="/e/:slug"          element={<GuestEntry />} />
        <Route path="/e/:slug/camera"   element={<Camera />} />
        <Route path="/e/:slug/album"    element={<Album />} />
        <Route path="/albuns"           element={<ProtectedRoute><MyAlbums /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
