import { useState } from 'react';
import { UserProfile, logout } from '../lib/firebase';
import { Button } from './ui/button';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CalendarCheck, 
  GraduationCap, 
  LogOut,
  Menu,
  X,
  Calendar,
  Settings,
  Bell,
  BrainCircuit
} from 'lucide-react';
import { cn } from '../lib/utils';
import AdminDashboard from '../pages/AdminDashboard';
import TeacherDashboard from '../pages/TeacherDashboard';
import StudentDashboard from '../pages/StudentDashboard';

interface DashboardProps {
  user: UserProfile;
}

export default function Dashboard({ user }: DashboardProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'] },
    { id: 'users', label: 'Users', icon: Users, roles: ['admin'] },
    { id: 'classes', label: 'Classes', icon: BookOpen, roles: ['admin', 'teacher'] },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck, roles: ['admin', 'teacher', 'student'] },
    { id: 'grades', label: 'Grades', icon: GraduationCap, roles: ['admin', 'teacher', 'student'] },
    { id: 'exams', label: 'Exams', icon: BrainCircuit, roles: ['teacher', 'student'] },
    { id: 'schedule', label: 'Schedule', icon: Calendar, roles: ['student'] },
    { id: 'resources', label: 'Resources', icon: BookOpen, roles: ['student'] },
    { id: 'students', label: 'My Students', icon: Users, roles: ['teacher'] },
    { id: 'profile', label: 'Profile', icon: Settings, roles: ['admin', 'teacher', 'student'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  const renderContent = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard activeTab={activeTab} />;
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
              <span className="font-bold text-xl tracking-tight">EduFlow</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="ml-auto"
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
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isSidebarOpen && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-4 text-slate-500 hover:text-red-600 hover:bg-red-50",
              !isSidebarOpen && "justify-center px-0"
            )}
            onClick={logout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isSidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800 capitalize">
            {activeTab.replace('-', ' ')}
          </h2>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-500">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500">
              <Settings className="h-5 w-5" />
            </Button>
            <div className="h-8 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {user.name.charAt(0)}
              </div>
            </div>
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
