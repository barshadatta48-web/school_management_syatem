import { useState, useEffect } from 'react';
import { UserProfile, logout } from '../lib/firebase';
import { Button, buttonVariants } from './ui/button';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CalendarCheck, 
  GraduationCap, 
  Menu,
  X,
  Calendar,
  Settings,
  ClipboardList,
  User,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminDashboard from '../pages/AdminDashboard';
import TeacherDashboard from '../pages/TeacherDashboard';
import StudentDashboard from '../pages/StudentDashboard';
import SettingsManagement from './SettingsManagement';
import { useAppContext } from '../context/AppContext';

interface DashboardProps {
  user: UserProfile;
}

export default function Dashboard({ user }: DashboardProps) {
  const { t } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTabFromPath = () => {
    const parts = location.pathname.split('/');
    const tab = parts[parts.length - 1];
    if (tab === 'home') return 'overview';
    return tab || 'overview';
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromPath());
  const [settingsTab, setSettingsTab] = useState('profile');

  useEffect(() => {
    setActiveTab(getActiveTabFromPath());
  }, [location.pathname]);

  useEffect(() => {
    const handleTabChange = (e: any) => {
      onTabClick(e.detail);
    };
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  const onTabClick = (tab: string) => {
    const base = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/staff' : '/portal';
    const path = tab === 'overview' ? `${base}/home` : `${base}/${tab}`;
    navigate(path);
  };

  const menuItems = [
    { id: 'overview', label: t('dashboard'), icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'] },
    { id: 'users', label: t('users') || 'Users', icon: Users, roles: ['admin'] },
    { id: 'classes', label: t('classes') || 'Classes', icon: BookOpen, roles: ['admin', 'teacher'] },
    { id: 'attendance', label: t('attendance'), icon: CalendarCheck, roles: ['admin', 'teacher', 'student'] },
    { id: 'grades', label: t('grades'), icon: GraduationCap, roles: ['admin', 'teacher', 'student'] },
    { id: 'exams', label: t('exams'), icon: ClipboardList, roles: ['admin', 'teacher', 'student'] },
    { id: 'schedule', label: t('schedule'), icon: Calendar, roles: ['student'] },
    { id: 'resources', label: t('resources') || 'Resources', icon: BookOpen, roles: ['student'] },
    { id: 'students', label: t('students') || 'My Students', icon: Users, roles: ['teacher'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  const renderContent = () => {
    if (activeTab === 'settings') {
      return <SettingsManagement user={user} activeTab={settingsTab} />;
    }

    switch (user.role) {
      case 'admin':
        return <AdminDashboard activeTab={activeTab} user={user} />;
      case 'teacher':
        return <TeacherDashboard activeTab={activeTab} user={user} />;
      case 'student':
        return <StudentDashboard activeTab={activeTab} user={user} />;
      default:
        return <div>Access Denied</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl tracking-tight dark:text-white">{t('dashboard')}</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="ml-auto dark:text-slate-400"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {filteredMenu.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-4 h-12",
                !isSidebarOpen && "justify-center px-0"
              )}
              onClick={() => onTabClick(item.id)}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isSidebarOpen && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-4 text-slate-500",
              !isSidebarOpen && "justify-center px-0"
            )}
            onClick={() => { setSettingsTab('preferences'); onTabClick('settings'); }}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {isSidebarOpen && <span>{t('settings')}</span>}
          </Button>
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-4 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10",
              !isSidebarOpen && "justify-center px-0"
            )}
            onClick={logout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isSidebarOpen && <span>{t('logout')}</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden dark:bg-slate-950">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 capitalize">
            {activeTab === 'settings' ? t('profile') : (t(activeTab) || activeTab.replace('-', ' '))}
          </h2>
          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

            <button 
              type="button" 
              className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors outline-none"
              onClick={() => { setSettingsTab('profile'); onTabClick('settings'); }}
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{user.name}</p>
                <p className="text-[10px] text-slate-500 capitalize">
                  {user.role} {user.academyName ? `• ${user.academyName}` : ''}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-slate-200 dark:border-slate-700">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
