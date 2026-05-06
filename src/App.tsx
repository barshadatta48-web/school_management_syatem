/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { db, UserProfile, OperationType, handleFirestoreError, getStoredUserId, logout as firebaseLogout } from './lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Toaster } from './components/ui/sonner';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './components/Dashboard';

function AppContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = (loggedUser: UserProfile) => {
    setUser(loggedUser);
    const path = loggedUser.role === 'admin' ? '/admin/home' : loggedUser.role === 'teacher' ? '/staff/home' : '/portal/home';
    navigate(path, { replace: true });
  };

  useEffect(() => {
    const storedUserId = getStoredUserId();
    let profileUnsubscribe: (() => void) | null = null;

    if (storedUserId) {
      profileUnsubscribe = onSnapshot(doc(db, 'users', storedUserId), (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUser(userData);
          setLoading(false);
          
          if (location.pathname === '/login' || location.pathname === '/') {
            const path = userData.role === 'admin' ? '/admin/home' : userData.role === 'teacher' ? '/staff/home' : '/portal/home';
            navigate(path, { replace: true });
          }
        } else {
          // Profile document doesn't exist
          setUser(null);
          setLoading(false);
          localStorage.removeItem('eduflow_auth_user_id');
        }
      }, (error) => {
        console.error("Profile listen error:", error);
        setLoading(false);
      });
    } else {
      setUser(null);
      setLoading(false);
    }

    return () => {
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, [navigate]); 

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin/home' : user.role === 'teacher' ? '/staff/home' : '/portal/home'} /> : <Login onLogin={handleLogin} onMockLogin={handleLogin} />} />
        
        {/* Admin Routes */}
        <Route path="/admin/*" element={user?.role === 'admin' ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        
        {/* Staff/Teacher Routes */}
        <Route path="/staff/*" element={user?.role === 'teacher' ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        
        {/* Portal/Student Routes */}
        <Route path="/portal/*" element={user?.role === 'student' ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
