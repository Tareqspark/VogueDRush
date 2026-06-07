import React, { useState, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { QueryClient, QueryClientProvider } from 'react-query';
import ErrorBoundary from './components/UI/ErrorBoundary';
import LoadingSpinner from './components/UI/LoadingSpinner';

// Layout Components
import Layout from './components/Layout/Layout';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Lazy load page components for code splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Orders = lazy(() => import('./pages/Orders'));
const Kitchen = lazy(() => import('./pages/Kitchen'));
const Tables = lazy(() => import('./pages/Tables'));
const Menu = lazy(() => import('./pages/Menu'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Delivery = lazy(() => import('./pages/Delivery'));
const Users = lazy(() => import('./pages/Users'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const Changelog = lazy(() => import('./pages/Changelog'));
const QaGuide = lazy(() => import('./pages/QaGuide'));
const QaLinkedPage = lazy(() => import('./pages/QaLinkedPage'));

// ERP Module Pages
const Inventory            = lazy(() => import('./pages/Inventory'));
const Purchase             = lazy(() => import('./pages/Purchase'));
const Suppliers            = lazy(() => import('./pages/Suppliers'));
const CRM                  = lazy(() => import('./pages/CRM'));
const Expenses             = lazy(() => import('./pages/Expenses'));
const Accounting           = lazy(() => import('./pages/Accounting'));
const HR                   = lazy(() => import('./pages/HR'));
const QROrdering           = lazy(() => import('./pages/QROrdering'));
const Fleet                = lazy(() => import('./pages/Fleet'));
const AdvancedReservations = lazy(() => import('./pages/AdvancedReservations'));
const Branches             = lazy(() => import('./pages/Branches'));
const BusinessIntelligence = lazy(() => import('./pages/BusinessIntelligence'));

// Phase 2 Enterprise Operations Pages
const Production      = lazy(() => import('./pages/Production'));
const FoodCosting     = lazy(() => import('./pages/FoodCosting'));
const ProcurementIntel = lazy(() => import('./pages/ProcurementIntel'));
const AssetManagement = lazy(() => import('./pages/AssetManagement'));
const Maintenance     = lazy(() => import('./pages/Maintenance'));
const Catering        = lazy(() => import('./pages/Catering'));
const Banquet         = lazy(() => import('./pages/Banquet'));
const Marketing       = lazy(() => import('./pages/Marketing'));
const Reviews         = lazy(() => import('./pages/Reviews'));
const Aggregator      = lazy(() => import('./pages/Aggregator'));
const TaxCompliance   = lazy(() => import('./pages/TaxCompliance'));
const Documents       = lazy(() => import('./pages/Documents'));
const AIForecasting   = lazy(() => import('./pages/AIForecasting'));
const CallCenter      = lazy(() => import('./pages/CallCenter'));
const HoldOrders      = lazy(() => import('./pages/HoldOrders'));
const CancelledOrders = lazy(() => import('./pages/CancelledOrders'));
const CollectedAmount = lazy(() => import('./pages/CollectedAmount'));
const QueueManagement = lazy(() => import('./pages/QueueManagement'));
const GiftCards       = lazy(() => import('./pages/GiftCards'));
const Membership      = lazy(() => import('./pages/Membership'));
const Complaints      = lazy(() => import('./pages/Complaints'));
const Messaging       = lazy(() => import('./pages/Messaging'));
const PublicAPI       = lazy(() => import('./pages/PublicAPI'));

// Create React Query client with enhanced configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnReconnect: true,
      suspense: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Loading fallback component for lazy loading
const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #FEF9C3 100%)' }}>
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-slate-500 text-sm font-medium">Loading page...</p>
    </div>
  </div>
);
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

  // requiredRole can be a string or an array of strings
  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #FEF9C3 100%)' }}>
          <div className="text-center p-8 bg-white rounded-2xl shadow-card">
            <h1 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h1>
            <p className="text-slate-500">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return children;
};

const RouteDataReloader = () => {
  const location = useLocation();

  useEffect(() => {
    // Refresh data whenever user switches pages.
    queryClient.invalidateQueries();
  }, [location.pathname]);

  return null;
};

// ── Branch Selector — shown after login when no branch is stored ──────────
const BranchSelector = () => {
  const { selectBranch } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchBranches = () => {
    setLoading(true);
    setError(false);
    // Use the base URL directly — no auth needed for GET /branches
    const base = typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api';
    fetch(`${base}/branches`)
      .then(r => r.json())
      .then(data => {
        setBranches(data.branches || []);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchBranches(); }, []); // eslint-disable-line

  const BRANCH_STYLES = [
    { bg: 'from-sky-500 to-sky-700',    icon: '🏛️' },
    { bg: 'from-violet-500 to-violet-700', icon: '🌿' },
    { bg: 'from-emerald-500 to-emerald-700', icon: '🍃' },
    { bg: 'from-amber-500 to-amber-700',  icon: '⭐' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #FEF9C3 100%)' }}>
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #0284C7, #EAB308)' }}>VD</div>
          <h1 className="text-2xl font-black text-slate-800">Select Branch</h1>
          <p className="text-slate-500 text-sm mt-1">Choose the branch you want to manage today</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-slate-500 mb-4">Could not load branches. Check your connection.</p>
            <button onClick={fetchBranches} className="btn btn-primary">Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {branches.filter(b => b.is_active).map((branch, i) => {
              const style = BRANCH_STYLES[i % BRANCH_STYLES.length];
              return (
                <button
                  key={branch.id}
                  onClick={() => selectBranch(branch)}
                  className={`bg-gradient-to-br ${style.bg} text-white rounded-2xl p-6 text-left hover:scale-105 active:scale-95 transition-all shadow-lg group`}
                >
                  <span className="text-4xl mb-3 block">{style.icon}</span>
                  <h2 className="text-xl font-black leading-tight">{branch.name}</h2>
                  {branch.address && (
                    <p className="text-white/70 text-xs mt-1 leading-snug">{branch.address}</p>
                  )}
                  {branch.phone && (
                    <p className="text-white/70 text-xs mt-0.5">{branch.phone}</p>
                  )}
                  <div className="mt-4 flex items-center gap-1 text-white/80 text-sm font-semibold group-hover:text-white">
                    Enter branch →
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Content
const AppContent = () => {
  const { user, loading, selectedBranch } = useAuth();
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

  // Staff with an assigned branch skip the selector — auto-selected on login via AuthContext
  // Admins/managers without an assigned branch see the selector
  if (user && !selectedBranch && !user.branch_id) {
    return (
      <Router>
        <BranchSelector />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </Router>
    );
  }

  if (!user) {
    return (
      <Router>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
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
        <RouteDataReloader />
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
            <main className="p-4 lg:p-6 min-h-[calc(100vh-4rem)]" key={typeof window !== 'undefined' ? window.location.pathname : 'app'}>
              <Suspense fallback={<PageLoadingFallback />}>
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

                  <Route path="/hold-orders" element={<ProtectedRoute><Layout><HoldOrders /></Layout></ProtectedRoute>} />
                  <Route path="/cancelled-orders" element={<ProtectedRoute><Layout><CancelledOrders /></Layout></ProtectedRoute>} />
                  <Route path="/collected-amount" element={<ProtectedRoute requiredRole={['admin', 'manager']}><Layout><CollectedAmount /></Layout></ProtectedRoute>} />

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

                  {/* Menu - admin and manager */}
                  <Route
                    path="/menu"
                    element={
                      <ProtectedRoute requiredRole={['admin', 'manager']}>
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

                  {/* Reports - admin and manager */}
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute requiredRole={['admin', 'manager']}>
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

                  {/* Change Log - accessible to all roles */}
                  <Route
                    path="/changelog"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Changelog />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />

                  {/* QA Guide - accessible to all roles */}
                  <Route
                    path="/qa-guide"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <QaGuide />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />

                  {/* QA linked module placeholder routes */}
                  <Route
                    path="/inventory/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Layout>
                          <Inventory />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/purchase/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Layout>
                          <Purchase />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/suppliers/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Layout>
                          <Suppliers />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/crm/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Layout>
                          <CRM />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/expenses/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Layout>
                          <Expenses />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/accounting/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Layout>
                          <Accounting />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/hr/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Layout>
                          <HR />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/qr-ordering/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Layout>
                          <QROrdering />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/fleet/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Layout>
                          <Fleet />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/advanced-reservations/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Layout>
                          <AdvancedReservations />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/branches/*"
                    element={
                      <ProtectedRoute requiredRole={['admin', 'manager']}>
                        <Layout>
                          <Branches />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/bi/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Layout>
                          <BusinessIntelligence />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Phase 2 Enterprise Operations Routes */}
                  <Route path="/production/*" element={<ProtectedRoute requiredRole="admin"><Layout><Production /></Layout></ProtectedRoute>} />
                  <Route path="/food-costing/*" element={<ProtectedRoute requiredRole="admin"><Layout><FoodCosting /></Layout></ProtectedRoute>} />
                  <Route path="/procurement/*" element={<ProtectedRoute requiredRole="admin"><Layout><ProcurementIntel /></Layout></ProtectedRoute>} />
                  <Route path="/assets/*" element={<ProtectedRoute requiredRole="admin"><Layout><AssetManagement /></Layout></ProtectedRoute>} />
                  <Route path="/maintenance/*" element={<ProtectedRoute requiredRole="admin"><Layout><Maintenance /></Layout></ProtectedRoute>} />
                  <Route path="/catering/*" element={<ProtectedRoute requiredRole="admin"><Layout><Catering /></Layout></ProtectedRoute>} />
                  <Route path="/banquet/*" element={<ProtectedRoute requiredRole="admin"><Layout><Banquet /></Layout></ProtectedRoute>} />
                  <Route path="/marketing/*" element={<ProtectedRoute requiredRole="admin"><Layout><Marketing /></Layout></ProtectedRoute>} />
                  <Route path="/reviews/*" element={<ProtectedRoute requiredRole="admin"><Layout><Reviews /></Layout></ProtectedRoute>} />
                  <Route path="/aggregator/*" element={<ProtectedRoute requiredRole="admin"><Layout><Aggregator /></Layout></ProtectedRoute>} />
                  <Route path="/tax/*" element={<ProtectedRoute requiredRole="admin"><Layout><TaxCompliance /></Layout></ProtectedRoute>} />
                  <Route path="/documents/*" element={<ProtectedRoute requiredRole="admin"><Layout><Documents /></Layout></ProtectedRoute>} />
                  <Route path="/forecasting/*" element={<ProtectedRoute requiredRole="admin"><Layout><AIForecasting /></Layout></ProtectedRoute>} />
                  <Route path="/call-center/*" element={<ProtectedRoute requiredRole="admin"><Layout><CallCenter /></Layout></ProtectedRoute>} />
                  <Route path="/queue/*" element={<ProtectedRoute requiredRole="admin"><Layout><QueueManagement /></Layout></ProtectedRoute>} />
                  <Route path="/gift-cards/*" element={<ProtectedRoute requiredRole="admin"><Layout><GiftCards /></Layout></ProtectedRoute>} />
                  <Route path="/membership/*" element={<ProtectedRoute requiredRole="admin"><Layout><Membership /></Layout></ProtectedRoute>} />
                  <Route path="/complaints/*" element={<ProtectedRoute requiredRole="admin"><Layout><Complaints /></Layout></ProtectedRoute>} />
                  <Route path="/messaging/*" element={<ProtectedRoute requiredRole="admin"><Layout><Messaging /></Layout></ProtectedRoute>} />
                  <Route path="/api-ecosystem/*" element={<ProtectedRoute requiredRole="admin"><Layout><PublicAPI /></Layout></ProtectedRoute>} />

                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
