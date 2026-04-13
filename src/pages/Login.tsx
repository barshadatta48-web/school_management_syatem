import React, { useState } from 'react';
import { loginWithGoogle, loginWithEmail, registerWithEmail, UserProfile, auth } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { GraduationCap, LogIn, Mail, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';

interface LoginProps {
  onMockLogin: (user: UserProfile) => void;
}

export default function Login({ onMockLogin }: LoginProps) {
  const { t, darkMode } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [isAutoAuth, setIsAutoAuth] = useState(true);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Successfully logged in with Google!");
    } catch (error) {
      toast.error("Google login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      if (isAutoAuth) {
        // Try to login with default password, if fails, register
        try {
          localStorage.setItem('pending_role', role);
          await loginWithEmail(email, password || 'password123');
          toast.success("Logged in successfully!");
        } catch (err: any) {
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            await registerWithEmail(email, password || 'password123');
            toast.success("Account created and logged in!");
          } else {
            throw err;
          }
        }
        return;
      }

      if (isSignUp) {
        localStorage.setItem('pending_role', role);
        await registerWithEmail(email, password);
        toast.success("Account created successfully!");
      } else {
        await loginWithEmail(email, password);
        toast.success("Successfully logged in!");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error("Invalid email or password. If you don't have an account, please Sign Up first.");
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error("Email already in use. Try logging in instead.");
      } else if (error.code === 'auth/weak-password') {
        toast.error("Password should be at least 6 characters.");
      } else {
        toast.error(isSignUp ? "Registration failed. Please try again." : "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = () => {
    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      const mockUser: UserProfile = {
        uid: `mock_${role}_${Date.now()}`,
        email: email || `${role}@school.edu`,
        name: (email || role).split('@')[0],
        role: role,
        createdAt: new Date().toISOString(),
      };
      onMockLogin(mockUser);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 p-4 transition-colors duration-300">
      <Card className="w-full max-w-md border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit mb-2">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">EduFlow</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            The complete school management system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button 
              variant={isAutoAuth ? "default" : "outline"} 
              onClick={() => setIsAutoAuth(true)}
              className="flex-1"
            >
              Quick Access
            </Button>
            <Button 
              variant={!isAutoAuth ? "default" : "outline"} 
              onClick={() => setIsAutoAuth(false)}
              className="flex-1"
            >
              Secure Auth
            </Button>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="dark:text-slate-200">{t('emailAddress') || 'Email Address'}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  id="email"
                  type="email" 
                  placeholder="name@school.edu" 
                  className="pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            {!isAutoAuth && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="password"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {(isSignUp || isAutoAuth) && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="dark:text-slate-200">{t('selectRole') || 'Select Your Role'}</Label>
                <Select value={role} onValueChange={(val: any) => setRole(val)}>
                  <SelectTrigger className="w-full h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="Select a role" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('admin') || 'Administrator'}</SelectItem>
                    <SelectItem value="teacher">{t('teacher') || 'Teacher'}</SelectItem>
                    <SelectItem value="student">{t('student') || 'Student'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button 
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-medium transition-all hover:shadow-lg"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  {isAutoAuth ? 'Enter Dashboard' : (isSignUp ? 'Create Account' : 'Sign In')}
                </>
              )}
            </Button>
          </form>

          {!isAutoAuth && (
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline font-medium"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button 
              variant="outline"
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="w-full h-11 border-slate-200 hover:bg-slate-50"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google Account
            </Button>

            <Button 
              variant="ghost"
              onClick={async () => {
                setLoading(true);
                try {
                  const { signInAnonymously } = await import('firebase/auth');
                  await signInAnonymously(auth);
                  toast.success("Logged in as Guest!");
                } catch (error) {
                  toast.error("Guest login failed.");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full h-11 text-slate-500"
            >
              Continue as Guest
            </Button>

            <div className="pt-4 border-t border-slate-100 mt-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold text-center mb-3">Developer Mock Access</p>
              <div className="flex gap-2">
                <Select value={role} onValueChange={(val: any) => setRole(val)}>
                  <SelectTrigger className="flex-1 h-11">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="Select a role" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="secondary" onClick={handleMockLogin} className="h-11">Mock Login</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
