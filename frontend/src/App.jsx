import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewEvent from './pages/events/NewEvent.jsx';
import EventDashboard from './pages/events/EventDashboard.jsx';
import GuestEntry from './pages/guest/GuestEntry.jsx';
import Camera from './pages/guest/Camera.jsx';
import Album from './pages/guest/Album.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1c1814',
            color: '#f0ebe3',
            border: '1px solid rgba(240,235,227,0.1)',
            fontSize: '14px',
            borderRadius: '14px',
          },
          success: { iconTheme: { primary: '#c9a86a', secondary: '#1c1814' } },
        }}
      />
      <Routes>
        <Route path="/"          element={<Landing />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/register"  element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/events/new" element={<ProtectedRoute><NewEvent /></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute><EventDashboard /></ProtectedRoute>} />
        <Route path="/e/:slug"          element={<GuestEntry />} />
        <Route path="/e/:slug/camera"   element={<Camera />} />
        <Route path="/e/:slug/album"    element={<Album />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
