import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container, Spinner } from 'react-bootstrap';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DocumentView from './pages/DocumentView';
import Upload from './pages/Upload';
import NotFound from './pages/NotFound';
import Home from './pages/Home';

// Components
import Header from './components/Header';

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const { user, loading, session } = useAuth();

  console.log('ProtectedRoute state:', {
    isLoading: loading,
    isAuthenticated: !!user,
    userId: user?.id,
    sessionActive: !!session
  });

  if (loading) {
    console.log('Auth is still loading');
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" variant="primary" />
        <div className="ms-3">Loading authentication...</div>
      </div>
    );
  }

  if (!user || !session) {
    console.log('No authenticated user or session, redirecting to login');
    // Add a message to inform the user they need to log in
    return <Navigate to="/login" state={{ message: "Please log in to access this page" }} />;
  }

  console.log('User authenticated, rendering protected content');
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-vh-100 bg-light">
          <Header />
          <Container className="py-4">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/documents/:id" element={
                <ProtectedRoute>
                  <DocumentView />
                </ProtectedRoute>
              } />
              <Route path="/upload" element={
                <ProtectedRoute>
                  <Upload />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Container>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
