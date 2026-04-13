import { useState, useEffect } from 'react';
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
import { useAppContext } from '../context/AppContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface SettingsManagementProps {
  user: UserProfile;
  activeTab?: string;
}

export default function SettingsManagement({ user, activeTab = "profile" }: SettingsManagementProps) {
  const { darkMode, setDarkMode, language, setLanguage, t } = useAppContext();
  const [currentTab, setCurrentTab] = useState(activeTab);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    updates: true,
    marketing: false
  });

  const [twoFactor, setTwoFactor] = useState(false);

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  const isProfileOnly = currentTab === 'profile';

  if (isProfileOnly) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <ProfileManagement user={user} title={t('profileDetails') || 'Profile Details'} description={t('updateInfo') || 'Update your personal and professional information'} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <UserCog className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('settings')}</h2>
          <p className="text-slate-500">{t('managePreferences') || 'Manage your preferences and security'}</p>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="preferences" className="gap-2">
            <Bell className="h-4 w-4" />
            {t('preferences')}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            {t('security')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Notifications */}
            <Card className="border-none shadow-sm dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
                  <Bell className="h-5 w-5 text-blue-500" />
                  {t('notifications')}
                </CardTitle>
                <CardDescription>{t('configureAlerts') || 'Configure how you receive alerts'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold dark:text-slate-200">{t('emailNotifications')}</Label>
                    <p className="text-xs text-slate-500">{t('receiveEmail') || 'Receive updates via email'}</p>
                  </div>
                  <Switch 
                    checked={notifications.email} 
                    onCheckedChange={(val) => setNotifications({...notifications, email: val})} 
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold dark:text-slate-200">{t('pushNotifications')}</Label>
                    <p className="text-xs text-slate-500">{t('receivePush') || 'Receive alerts on your device'}</p>
                  </div>
                  <Switch 
                    checked={notifications.push} 
                    onCheckedChange={(val) => setNotifications({...notifications, push: val})} 
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold dark:text-slate-200">{t('systemUpdates')}</Label>
                    <p className="text-xs text-slate-500">{t('importantNews') || 'Important platform news'}</p>
                  </div>
                  <Switch 
                    checked={notifications.updates} 
                    onCheckedChange={(val) => setNotifications({...notifications, updates: val})} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card className="border-none shadow-sm dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
                  {darkMode ? <Moon className="h-5 w-5 text-indigo-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
                  {t('appearance')}
                </CardTitle>
                <CardDescription>{t('customizeVisual') || 'Customize your visual experience'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold dark:text-slate-200">{t('darkMode')}</Label>
                    <p className="text-xs text-slate-500">{t('switchDark') || 'Switch to a darker theme'}</p>
                  </div>
                  <Switch 
                    checked={darkMode} 
                    onCheckedChange={setDarkMode} 
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold dark:text-slate-200">{t('language')}</Label>
                    <p className="text-xs text-slate-500">{t('preferredLanguage') || 'Preferred display language'}</p>
                  </div>
                  <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
                    <SelectTrigger className="w-[140px] h-9">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="hi">हिन्दी</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} className="px-8 shadow-lg shadow-primary/20">{t('savePreferences')}</Button>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-none shadow-sm dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
                <Shield className="h-5 w-5 text-green-500" />
                {t('security')}
              </CardTitle>
              <CardDescription>{t('keepProfileSafe') || 'Keep your profile safe and secure'}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                      <Smartphone className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold dark:text-slate-200">{t('twoFactor')}</Label>
                      <p className="text-[10px] text-slate-500">{t('extraLayer') || 'Add an extra layer of security'}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={twoFactor} 
                    onCheckedChange={setTwoFactor} 
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                      <Mail className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold dark:text-slate-200">{t('verifiedEmail')}</Label>
                      <p className="text-[10px] text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">Verified</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-bold">{t('passwordManagement')}</span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-500">
                    {t('passwordLastChanged') || 'Your password was last changed 3 months ago. We recommend updating it every 6 months.'}
                  </p>
                  <Button variant="outline" size="sm" className="w-full bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">
                    {t('changePassword')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} className="px-8 shadow-lg shadow-primary/20">{t('saveSecurity')}</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
