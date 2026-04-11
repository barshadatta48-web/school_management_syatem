import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { 
  Bell, 
  Moon, 
  Sun, 
  Lock, 
  Globe, 
  Shield, 
  Smartphone,
  Mail,
  UserCog,
  User
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import ProfileManagement from './ProfileManagement';
import { UserProfile } from '../lib/firebase';

interface SettingsManagementProps {
  user: UserProfile;
}

export default function SettingsManagement({ user }: SettingsManagementProps) {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    updates: true,
    marketing: false
  });

  const [darkMode, setDarkMode] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <UserCog className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <p className="text-slate-500">Manage your profile, preferences and security</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Bell className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileManagement user={user} title="Profile Details" description="Update your personal and professional information" />
        </TabsContent>

        <TabsContent value="preferences">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Notifications */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5 text-blue-500" />
                  Notifications
                </CardTitle>
                <CardDescription>Configure how you receive alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Email Notifications</Label>
                    <p className="text-xs text-slate-500">Receive updates via email</p>
                  </div>
                  <Switch 
                    checked={notifications.email} 
                    onCheckedChange={(val) => setNotifications({...notifications, email: val})} 
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Push Notifications</Label>
                    <p className="text-xs text-slate-500">Receive alerts on your device</p>
                  </div>
                  <Switch 
                    checked={notifications.push} 
                    onCheckedChange={(val) => setNotifications({...notifications, push: val})} 
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">System Updates</Label>
                    <p className="text-xs text-slate-500">Important platform news</p>
                  </div>
                  <Switch 
                    checked={notifications.updates} 
                    onCheckedChange={(val) => setNotifications({...notifications, updates: val})} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {darkMode ? <Moon className="h-5 w-5 text-indigo-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
                  Appearance
                </CardTitle>
                <CardDescription>Customize your visual experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Dark Mode</Label>
                    <p className="text-xs text-slate-500">Switch to a darker theme</p>
                  </div>
                  <Switch 
                    checked={darkMode} 
                    onCheckedChange={setDarkMode} 
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Language</Label>
                    <p className="text-xs text-slate-500">Preferred display language</p>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> English (US)
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} className="px-8 shadow-lg shadow-primary/20">Save Preferences</Button>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-green-500" />
                Security & Privacy
              </CardTitle>
              <CardDescription>Keep your profile safe and secure</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Smartphone className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Two-Factor Auth</Label>
                      <p className="text-[10px] text-slate-500">Add an extra layer of security</p>
                    </div>
                  </div>
                  <Switch 
                    checked={twoFactor} 
                    onCheckedChange={setTwoFactor} 
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Mail className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Verified Email</Label>
                      <p className="text-[10px] text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">Verified</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-bold">Password Management</span>
                  </div>
                  <p className="text-xs text-amber-700">
                    Your password was last changed 3 months ago. We recommend updating it every 6 months.
                  </p>
                  <Button variant="outline" size="sm" className="w-full bg-white border-amber-200 text-amber-800 hover:bg-amber-100">
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} className="px-8 shadow-lg shadow-primary/20">Save Security Settings</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
