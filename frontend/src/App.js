import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { QueryClient, QueryClientProvider } from 'react-query';

// Layout Components
import Layout from './components/Layout/Layout';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Page Components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Kitchen from './pages/Kitchen';
import Tables from './pages/Tables';
import Menu from './pages/Menu';
import Reservations from './pages/Reservations';
import Delivery from './pages/Delivery';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

// Loading Component
import LoadingSpinner from './components/UI/LoadingSpinner';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #FEF9C3 100%)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #FEF9C3 100%)' }}>
        <div className="text-center p-8 bg-white rounded-2xl shadow-card">
          <h1 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-500">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return children;
};

// Main App Content
const AppContent = () => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #FEF9C3 100%)' }}>
        <div className="text-center">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #0284C7, #EAB308)' }}>VD</div>
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-500 text-sm font-medium">Loading Vogue D Rush...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E0F2FE',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgb(2 132 199 / 0.12)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#FFFFFF' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' } },
          }}
        />
      </Router>
    );
  }

  return (
    <Router>
      <SocketProvider>
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #FEF9C3 100%)', backgroundAttachment: 'fixed' }}>
          {/* Mobile sidebar backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-sky-950/20 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main content */}
          <div className="lg:pl-64">
            {/* Header */}
            <Header onMenuClick={() => setSidebarOpen(true)} />

            {/* Page content */}
            <main className="p-4 lg:p-6 min-h-[calc(100vh-4rem)]">
              <Routes>
                {/* Dashboard - accessible to all roles */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Orders - accessible to all roles */}
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Orders />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Kitchen - accessible to all roles */}
                <Route
                  path="/kitchen"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Kitchen />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Tables - accessible to all roles */}
                <Route
                  path="/tables"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Tables />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Menu - admin only */}
                <Route
                  path="/menu"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <Layout>
                        <Menu />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Reservations - accessible to all roles */}
                <Route
                  path="/reservations"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Reservations />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Delivery - accessible to all roles */}
                <Route
                  path="/delivery"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Delivery />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Users - admin only */}
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <Layout>
                        <Users />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Reports - admin only */}
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <Layout>
                        <Reports />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Settings - admin only */}
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <Layout>
                        <Settings />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Profile - accessible to all roles */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Profile />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E0F2FE',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgb(2 132 199 / 0.12)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#FFFFFF' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' } },
          }}
        />
      </SocketProvider>
    </Router>
  );
};

// Main App Component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
