import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import NotFound from './pages/NotFound';
import Header from './components/Header';
import PrivateRoute from './components/PrivateRoute';

// AdminLayout component to include Header for admin routes
const AdminLayout = ({ children }) => {
  return (
    <>
      <Header />
      <div className="container" style={{ backgroundColor: '#1f2937', padding: 0 }}>
        {children}
      </div>
    </>
  );
};

// Simple layout without header for user routes
const SimpleLayout = ({ children }) => {
  return (
    <div className="container" style={{ backgroundColor: '#1f2937', padding: 0 }}>
      {children}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/" element={<Navigate to="/login" />} />
          
          {/* Admin Routes - With Header */}
          <Route 
            path="/admin" 
            element={
              <AdminLayout>
                <PrivateRoute adminOnly={true}>
                  <Navigate to="/admin/dashboard" />
                </PrivateRoute>
              </AdminLayout>
            } 
          />
          <Route 
            path="/admin/dashboard" 
            element={
              <AdminLayout>
                <PrivateRoute adminOnly={true}>
                  <AdminDashboard section="dashboard" />
                </PrivateRoute>
              </AdminLayout>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <AdminLayout>
                <PrivateRoute adminOnly={true}>
                  <AdminDashboard section="users" />
                </PrivateRoute>
              </AdminLayout>
            } 
          />
          <Route 
            path="/admin/assign" 
            element={
              <AdminLayout>
                <PrivateRoute adminOnly={true}>
                  <AdminDashboard section="assign" />
                </PrivateRoute>
              </AdminLayout>
            } 
          />
          <Route 
            path="/admin/userlist" 
            element={
              <AdminLayout>
                <PrivateRoute adminOnly={true}>
                  <AdminDashboard section="userlist" />
                </PrivateRoute>
              </AdminLayout>
            } 
          />
          
          {/* User Routes - Without Header */}
          <Route 
            path="/dashboard" 
            element={
              <SimpleLayout>
                <PrivateRoute>
                  <UserDashboard />
                </PrivateRoute>
              </SimpleLayout>
            } 
          />
          
          {/* 404 Not Found - Must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App; 