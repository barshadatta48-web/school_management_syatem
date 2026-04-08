import { useState } from 'react';
import { loginWithGoogle } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { GraduationCap, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Successfully logged in!");
    } catch (error) {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <Card className="w-full max-w-md border-none shadow-2xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit">
            <GraduationCap className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">EduFlow</CardTitle>
            <CardDescription className="text-slate-500 text-lg">
              The complete school management system
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Button 
            onClick={handleLogin} 
            disabled={loading}
            className="w-full h-12 text-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <LogIn className="mr-2 h-5 w-5" />
            )}
            Sign in with Google
          </Button>
          <p className="mt-6 text-center text-sm text-slate-400">
            Secure access for Students, Teachers & Admins
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
