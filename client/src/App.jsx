import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/Landing';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import ReportPage from './pages/Report';
import MapViewPage from './pages/MapView';
import MyComplaintsPage from './pages/MyComplaints';
import ComplaintDetailPage from './pages/ComplaintDetail';
import DepartmentDashboard from './pages/DepartmentDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/map" element={<MapViewPage />} />
        <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        <Route path="/report" element={
          <ProtectedRoute><ReportPage /></ProtectedRoute>
        } />
        <Route path="/my-complaints" element={
          <ProtectedRoute><MyComplaintsPage /></ProtectedRoute>
        } />
        <Route path="/department" element={
          <ProtectedRoute roles={['department', 'admin']}><DepartmentDashboard /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
