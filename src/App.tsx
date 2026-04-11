/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { auth, db, UserProfile, OperationType, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './components/Dashboard';

function AppContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleMockLogin = (mockUser: UserProfile) => {
    setUser(mockUser);
    toast.success(`Logged in as ${mockUser.role}`);
    const path = mockUser.role === 'admin' ? '/admin/home' : mockUser.role === 'teacher' ? '/staff/home' : '/portal/home';
    navigate(path);
  };

  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Set up real-time listener for user profile
        userUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            // Force admin role if email matches hardcoded admin email
            if (firebaseUser.email === 'dattabarsha9@gmail.com' && userData.role !== 'admin') {
              try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
                // Snapshot listener will trigger again with updated data
              } catch (error) {
                console.error("Failed to auto-upgrade to admin:", error);
                setUser(userData);
                setLoading(false);
              }
            } else {
              setUser(userData);
              setLoading(false);
              
              // Handle redirection if on login page or root
              if (location.pathname === '/login' || location.pathname === '/') {
                const path = userData.role === 'admin' ? '/admin/home' : userData.role === 'teacher' ? '/staff/home' : '/portal/home';
                navigate(path);
              }
            }
          } else {
            // New user - default to student or check if admin email
            const isAdmin = firebaseUser.email === 'dattabarsha9@gmail.com';
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Anonymous',
              role: isAdmin ? 'admin' : 'student',
              createdAt: new Date().toISOString(),
              photoURL: firebaseUser.photoURL || undefined,
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
              toast.error("Failed to create user profile");
              setLoading(false);
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          toast.error("Failed to load user profile");
          setLoading(false);
        });
      } else {
        if (userUnsubscribe) {
          userUnsubscribe();
          userUnsubscribe = null;
        }
        setUser(null);
        setLoading(false);
        if (location.pathname !== '/login') {
          navigate('/login');
        }
      }
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, [navigate, location.pathname]);

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
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin/home' : user.role === 'teacher' ? '/staff/home' : '/portal/home'} /> : <Login onMockLogin={handleMockLogin} />} />
        
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
