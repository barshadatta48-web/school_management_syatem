import React, { useState } from 'react';
import { loginWithEmail, registerWithEmail, UserProfile } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { GraduationCap, LogIn, Mail, Lock, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  onMockLogin: (user: UserProfile) => void;
}

export default function Login({ onLogin, onMockLogin }: LoginProps) {
  const { t, darkMode } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<'admin' | 'teacher' | 'student'>('student');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter email");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const user = await registerWithEmail(email, password, { role });
        toast.success("Account created successfully!");
        onLogin(user);
      } else {
        const user = await loginWithEmail(email, password);
        toast.success("Successfully logged in!");
        onLogin(user);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Auth failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = () => {
    setLoading(true);
    // Use register to ensure mock user exists in Firestore for features like attendance
    registerWithEmail(`${role}_${Date.now()}@mock.com`, 'password', { 
      role, 
      name: `Mock ${role}` 
    }).then((user) => {
      onMockLogin(user);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      toast.error("Mock login failed");
      setLoading(false);
    });
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
          <Tabs defaultValue="signin" onValueChange={(val) => setIsSignUp(val === 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="dark:text-slate-200">{t('emailAddress') || 'Email Address'}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      id="signin-email"
                      type="email" 
                      placeholder="name@school.edu" 
                      className="pl-10 h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      id="signin-password"
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10 h-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-base font-medium"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="dark:text-slate-200">{t('emailAddress') || 'Email Address'}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      id="signup-email"
                      type="email" 
                      placeholder="name@school.edu" 
                      className="pl-10 h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      id="signup-password"
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10 h-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
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

                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-base font-medium"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="pt-4 border-t border-slate-100 mt-2">
            <p className="text-[10px] text-slate-400 uppercase font-bold text-center mb-3">Quick Mock Access</p>
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
              <Button variant="secondary" onClick={handleMockLogin} className="h-11">Login</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
