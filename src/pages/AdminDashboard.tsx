import { useState, useEffect } from 'react';
import { db, UserProfile, OperationType, handleFirestoreError, ClassData, Announcement, AttendanceRecord, GradeRecord, Exam, sendNotification } from '../lib/firebase';
import { collection, query, onSnapshot, updateDoc, doc, addDoc, getDocs, deleteDoc, orderBy, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button, buttonVariants } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Users, BookOpen, GraduationCap, ShieldAlert, Plus, X, Megaphone, Trash2, Search, CalendarCheck, Calendar, BrainCircuit, CheckCircle2, XCircle, HelpCircle, ArrowLeft, Clock, Eye, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import ProfileManagement from '../components/ProfileManagement';

interface AdminDashboardProps {
  activeTab: string;
  user: UserProfile;
}

export default function AdminDashboard({ activeTab, user }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newClass, setNewClass] = useState({ name: '', section: '', teacherId: '' });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', priority: 'medium' as const });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAnnounceDialogOpen, setIsAnnounceDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    teachers: 0,
    students: 0,
    classes: 0
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Detailed Attendance State
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Detailed Grades State
  const [selectedGradeClass, setSelectedGradeGradeClass] = useState<string | null>(null);
  const [totalScore, setTotalScore] = useState(100);

  useEffect(() => {
    const usersUnsubscribe = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const classesUnsubscribe = onSnapshot(query(collection(db, 'classes')), (snapshot) => {
      const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData));
      setClasses(classesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    });

    const announcementsUnsubscribe = onSnapshot(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
    });

    const attendanceUnsubscribe = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      setAttendanceRecords(snapshot.docs.map(doc => doc.data() as AttendanceRecord));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    });

    const gradesUnsubscribe = onSnapshot(collection(db, 'grades'), (snapshot) => {
      setGradeRecords(snapshot.docs.map(doc => doc.data() as GradeRecord));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'grades');
    });

    const examsUnsubscribe = onSnapshot(collection(db, 'exams'), (snapshot) => {
      setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'exams');
    });

    return () => {
      usersUnsubscribe();
      classesUnsubscribe();
      announcementsUnsubscribe();
      attendanceUnsubscribe();
      gradesUnsubscribe();
      examsUnsubscribe();
    };
  }, []);

  useEffect(() => {
    setStats({
      totalUsers: users.length,
      teachers: users.filter(u => u.role === 'teacher').length,
      students: users.filter(u => u.role === 'student').length,
      classes: classes.length
    });
  }, [users, classes]);

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'teacher' | 'student') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      toast.error("Failed to update role");
    }
  };

  const handleCreateClass = async () => {
    if (!newClass.name || !newClass.teacherId) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await addDoc(collection(db, 'classes'), {
        ...newClass,
        studentIds: [] // Initially empty
      });
      toast.success("Class created successfully");
      setIsDialogOpen(false);
      setNewClass({ name: '', section: '', teacherId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'classes');
    }
  };

  const assignStudentToClass = async (classId: string, studentId: string) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    if (cls.studentIds.includes(studentId)) {
      toast.info("Student already in class");
      return;
    }
    try {
      await updateDoc(doc(db, 'classes', classId), {
        studentIds: [...cls.studentIds, studentId]
      });
      toast.success("Student assigned to class");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classes/${classId}`);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const admin = users.find(u => u.role === 'admin');
      await addDoc(collection(db, 'announcements'), {
        ...newAnnouncement,
        authorId: admin?.uid || 'system',
        authorName: admin?.name || 'Admin',
        createdAt: new Date().toISOString()
      });

      // Send notifications to all users
      for (const u of users) {
        await sendNotification({
          userId: u.uid,
          title: 'New Announcement',
          message: newAnnouncement.title,
          type: 'info'
        });
      }

      toast.success("Announcement posted");
      setIsAnnounceDialogOpen(false);
      setNewAnnouncement({ title: '', content: '', priority: 'medium' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
    }
  };

  const submitGrade = async (studentId: string, classId: string, score: number) => {
    const gradeId = `grade_${classId}_${studentId}_${Date.now()}`;
    try {
      await setDoc(doc(db, 'grades', gradeId), {
        id: gradeId,
        studentId,
        classId,
        examName: 'Final Result', // Default name as requested to remove option
        score,
        totalScore,
        date: new Date().toISOString()
      });

      await sendNotification({
        userId: studentId,
        title: 'New Grade Posted',
        message: `Your exam result has been posted: ${score}/${totalScore}`,
        type: 'success'
      });

      toast.success("Grade submitted");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `grades/${gradeId}`);
    }
  };

  const markAttendance = async (studentId: string, classId: string, status: 'present' | 'absent') => {
    const attendanceId = `${classId}_${attendanceDate}`;
    try {
      const attendanceRef = doc(db, 'attendance', attendanceId);
      await setDoc(attendanceRef, {
        id: attendanceId,
        classId,
        date: attendanceDate,
        records: { [studentId]: status }
      }, { merge: true });
      toast.success(`Marked ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${attendanceId}`);
    }
  };

  const markAllPresent = async (classId: string, studentIds: string[]) => {
    const attendanceId = `${classId}_${attendanceDate}`;
    const records: Record<string, 'present' | 'absent'> = {};
    studentIds.forEach(sid => {
      records[sid] = 'present';
    });

    try {
      const attendanceRef = doc(db, 'attendance', attendanceId);
      await setDoc(attendanceRef, {
        id: attendanceId,
        classId,
        date: attendanceDate,
        records
      }, { merge: true });
      toast.success("Marked all present");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${attendanceId}`);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
      toast.success("Announcement deleted");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `announcements/${id}`);
    }
  };

  const recentActivities = [
    ...announcements.slice(0, 2).map(ann => ({
      user: 'Admin',
      action: `posted announcement: ${ann.title}`,
      time: new Date(ann.createdAt).toLocaleDateString(),
      icon: Megaphone,
      color: 'text-orange-500'
    })),
    ...users.filter(u => u.createdAt).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 2).map(u => ({
      user: 'System',
      action: `new ${u.role} registered: ${u.name}`,
      time: new Date(u.createdAt).toLocaleDateString(),
      icon: Users,
      color: 'text-purple-500'
    })),
    ...gradeRecords.slice(0, 2).map(g => {
      const student = users.find(u => u.uid === g.studentId);
      return {
        user: student?.name || 'Student',
        action: `received grade for ${g.examName}`,
        time: new Date(g.date).toLocaleDateString(),
        icon: GraduationCap,
        color: 'text-green-500'
      };
    })
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

  if (activeTab === 'overview') {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="bg-blue-500" />
          <StatCard title="Teachers" value={stats.teachers} icon={ShieldAlert} color="bg-purple-500" />
          <StatCard title="Students" value={stats.students} icon={GraduationCap} color="bg-green-500" />
          <StatCard title="Classes" value={stats.classes} icon={BookOpen} color="bg-orange-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Badge variant="outline" className="bg-white">Live Updates</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <p className="text-sm text-slate-500 italic text-center py-8">No recent activity found.</p>
                ) : (
                  recentActivities.map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className={`p-2 rounded-lg bg-white border border-slate-100 ${activity.color}`}>
                        <activity.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          <span className="font-bold">{activity.user}</span> {activity.action}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{activity.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Quick Management</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'users' }))}>
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase">Manage Users</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'classes' }))}>
                  <BookOpen className="h-5 w-5 text-green-500" />
                  <span className="text-[10px] font-bold uppercase">Manage Classes</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'exams' }))}>
                  <BrainCircuit className="h-5 w-5 text-purple-500" />
                  <span className="text-[10px] font-bold uppercase">Manage Exams</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => setIsAnnounceDialogOpen(true)}>
                  <Megaphone className="h-5 w-5 text-orange-500" />
                  <span className="text-[10px] font-bold uppercase">New Announce</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Announcements</CardTitle>
                <Dialog open={isAnnounceDialogOpen} onOpenChange={setIsAnnounceDialogOpen}>
                  <DialogTrigger 
                    render={
                      <button 
                        type="button"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" })
                        )}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Post Announcement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Input value={newAnnouncement.content} onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={newAnnouncement.priority} onValueChange={(val: any) => setNewAnnouncement({...newAnnouncement, priority: val})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={handleCreateAnnouncement}>Post</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {announcements.map(ann => (
                  <div key={ann.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 relative group">
                    <div className="flex justify-between items-start mb-1">
                      <Badge variant={ann.priority === 'high' ? 'destructive' : ann.priority === 'medium' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1">
                        {ann.priority}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                        onClick={() => deleteAnnouncement(ann.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <h4 className="font-bold text-sm">{ann.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{ann.content}</p>
                    <span className="text-[10px] text-slate-400 mt-2 block">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.slice(0, 5).map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'teacher' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === 'users') {
    const filteredUsers = users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage roles and permissions for all users</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'teacher' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={user.role} 
                      onValueChange={(val) => handleRoleChange(user.uid, val as any)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Change Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (activeTab === 'classes') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Manage Classes</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger 
              render={
                <button 
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "default" })
                  )}
                >
                  <Plus className="h-4 w-4 mr-2" /> Create Class
                </button>
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Create Class
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Class Name</Label>
                  <Input placeholder="e.g. Mathematics" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Input placeholder="e.g. A" value={newClass.section} onChange={e => setNewClass({...newClass, section: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Assign Teacher</Label>
                  <Select value={newClass.teacherId} onValueChange={val => setNewClass({...newClass, teacherId: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => u.role === 'teacher').map(t => (
                        <SelectItem key={t.uid} value={t.uid}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleCreateClass}>Create Class</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map(cls => (
            <Card key={cls.id} className="border-none shadow-sm flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{cls.name}</span>
                  <Badge variant="outline">{cls.section}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Teacher:</span>
                  <span className="font-medium">{users.find(u => u.uid === cls.teacherId)?.name || 'Unknown'}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Enrolled Students:</span>
                    <Badge>{cls.studentIds.length}</Badge>
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2 bg-slate-50/50">
                    {cls.studentIds.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-2">No students enrolled</p>
                    ) : (
                      <div className="space-y-1">
                        {cls.studentIds.map(sid => {
                          const student = users.find(u => u.uid === sid);
                          return (
                            <div key={sid} className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-slate-100">
                              <span>{student?.name || 'Unknown'}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 text-slate-400 hover:text-red-500"
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'classes', cls.id), {
                                      studentIds: cls.studentIds.filter(id => id !== sid)
                                    });
                                    toast.success("Student removed from class");
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.UPDATE, `classes/${cls.id}`);
                                  }
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t mt-auto">
                  <Label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block">Add Student</Label>
                  <Select value="" onValueChange={(val: string) => assignStudentToClass(cls.id, val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Student" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => u.role === 'student' && !cls.studentIds.includes(u.uid)).map(s => (
                        <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'attendance') {
    const totalPresent = attendanceRecords.reduce((acc, r) => acc + Object.values(r.records).filter(s => s === 'present').length, 0);
    const totalPossible = attendanceRecords.reduce((acc, r) => acc + Object.values(r.records).length, 0);
    const overallRate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

    if (selectedAttendanceClass) {
      const cls = classes.find(c => c.id === selectedAttendanceClass);
      const record = attendanceRecords.find(r => r.classId === selectedAttendanceClass && r.date === attendanceDate);
      
      const stats = {
        present: record ? Object.values(record.records).filter(s => s === 'present').length : 0,
        absent: record ? Object.values(record.records).filter(s => s === 'absent').length : 0,
        noRecord: (cls?.studentIds.length || 0) - (record ? Object.keys(record.records).length : 0)
      };

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-green-600 uppercase">Present</p>
                    <p className="text-2xl font-bold text-green-700">{stats.present}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-red-600 uppercase">Absent</p>
                    <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-slate-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">No Record</p>
                    <p className="text-2xl font-bold text-slate-700">{stats.noRecord}</p>
                  </div>
                  <HelpCircle className="h-8 w-8 text-slate-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-slate-900">Mark Attendance</CardTitle>
                <CardDescription>Record daily presence for students</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Date</Label>
                  <Input 
                    type="date" 
                    className="h-9 w-40 bg-white shadow-sm"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="mt-5" onClick={() => setSelectedAttendanceClass(null)}>Back</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Subject Name</Label>
                  <p className="font-bold text-slate-700">{cls?.name} - {cls?.section}</p>
                </div>
                <div className="flex items-end justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => cls && markAllPresent(cls.id, cls.studentIds)} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark All Present
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-center">Present / Absent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cls?.studentIds.map(sid => {
                    const student = users.find(u => u.uid === sid);
                    const status = record?.records[sid];
                    return (
                      <TableRow key={sid}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                              {student?.name.charAt(0) || '?'}
                            </div>
                            {student?.name || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-4">
                            <button 
                              onClick={() => markAttendance(sid, selectedAttendanceClass, 'present')}
                              className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                                status === 'present' 
                                  ? "bg-green-500 text-white shadow-md scale-110" 
                                  : "bg-slate-100 text-slate-400 hover:bg-green-50 hover:text-green-500"
                              )}
                            >
                              <Check className="h-6 w-6" />
                            </button>
                            <button 
                              onClick={() => markAttendance(sid, selectedAttendanceClass, 'absent')}
                              className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                                status === 'absent' 
                                  ? "bg-red-500 text-white shadow-md scale-110" 
                                  : "bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500"
                              )}
                            >
                              <X className="h-6 w-6" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      );
    }

    const classAttendance = classes.map(cls => {
      const records = attendanceRecords.filter(r => r.classId === cls.id);
      let present = 0;
      let total = 0;
      records.forEach(r => {
        Object.values(r.records).forEach(status => {
          total++;
          if (status === 'present') present++;
        });
      });
      return {
        id: cls.id,
        name: cls.name,
        section: cls.section,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
        totalRecords: total
      };
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-primary uppercase">Overall Attendance</p>
                  <p className="text-3xl font-bold text-slate-900">{overallRate}%</p>
                </div>
                <Users className="h-10 w-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Classes</p>
                  <p className="text-3xl font-bold text-slate-900">{classes.length}</p>
                </div>
                <BookOpen className="h-10 w-10 text-slate-100" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Records</p>
                  <p className="text-3xl font-bold text-slate-900">{attendanceRecords.length}</p>
                </div>
                <Calendar className="h-10 w-10 text-slate-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>School-wide Attendance</CardTitle>
            <CardDescription>Average attendance rate per class across all recorded dates</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Attendance Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                      <Calendar className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      No classes found. Create a class to start tracking attendance.
                    </TableCell>
                  </TableRow>
                ) : (
                  classAttendance.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.section}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all",
                                cls.rate >= 90 ? "bg-green-500" : cls.rate >= 75 ? "bg-blue-500" : "bg-orange-500"
                              )} 
                              style={{ width: `${cls.rate}%` }} 
                            />
                          </div>
                          <span className="text-sm font-bold">{cls.rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cls.rate >= 75 ? 'default' : 'destructive'}>
                          {cls.rate >= 75 ? 'Healthy' : 'Low'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedAttendanceClass(cls.id)}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === 'grades') {
    if (selectedGradeClass) {
      const cls = classes.find(c => c.id === selectedGradeClass);
      const classStudents = users.filter(u => cls?.studentIds.includes(u.uid));
      const classGrades = gradeRecords.filter(g => g.classId === selectedGradeClass);

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelectedGradeGradeClass(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold uppercase text-slate-400">Total Score</Label>
                <Input 
                  type="number" 
                  className="h-8 w-20" 
                  value={totalScore} 
                  onChange={(e) => setTotalScore(Number(e.target.value))} 
                />
              </div>
            </div>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Upload Results: {cls?.name}</CardTitle>
              <CardDescription>Enter scores for students in this class</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classStudents.map((student) => {
                    const latestGrade = [...classGrades]
                      .filter(g => g.studentId === student.uid)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                    return (
                      <TableRow key={student.uid}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              className="w-24 h-8" 
                              placeholder="Score"
                              onBlur={(e) => {
                                const val = e.target.value === '' ? NaN : Number(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  submitGrade(student.uid, selectedGradeClass, val);
                                }
                              }}
                            />
                            <span className="text-xs text-slate-400">/ {totalScore}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {latestGrade ? (
                            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                              Last: {latestGrade.score}/{latestGrade.totalScore}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No results</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      );
    }

    const classPerformance = classes.map(cls => {
      const records = gradeRecords.filter(r => r.classId === cls.id);
      const avg = records.length > 0 
        ? Math.round(records.reduce((acc, r) => acc + (r.score / r.totalScore), 0) / records.length * 100)
        : 0;
      return {
        id: cls.id,
        name: cls.name,
        section: cls.section,
        average: avg,
        totalRecords: records.length
      };
    });

    return (
      <div className="space-y-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Academic Records</CardTitle>
            <CardDescription>Consolidated performance by class</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Average Grade</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classPerformance.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.section}</TableCell>
                    <TableCell>
                      <Badge variant={cls.average >= 80 ? 'default' : cls.average >= 60 ? 'secondary' : 'destructive'}>
                        {cls.average}%
                      </Badge>
                    </TableCell>
                    <TableCell>{cls.totalRecords}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedGradeGradeClass(cls.id)}>
                        Upload Results
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === 'exams') {
    return (
      <div className="space-y-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Exam Schedule & Status</CardTitle>
            <CardDescription>Overview of all assigned exams across the school</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Title</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      <BrainCircuit className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      No exams scheduled yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  exams.map((exam) => {
                    const cls = classes.find(c => c.id === exam.classId);
                    const teacher = users.find(u => u.uid === exam.teacherId);
                    return (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.title}</TableCell>
                        <TableCell>{cls?.name || 'Unknown'}</TableCell>
                        <TableCell>{teacher?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            exam.status === 'completed' ? 'secondary' : 
                            exam.status === 'ongoing' ? 'default' : 'outline'
                          }>
                            {exam.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {exam.scheduledDate ? new Date(exam.scheduledDate).toLocaleDateString() : 'TBD'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this exam? This will not delete recorded grades.")) {
                                try {
                                  await deleteDoc(doc(db, 'exams', exam.id));
                                  toast.success("Exam deleted");
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.DELETE, `exams/${exam.id}`);
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === 'profile') {
    return <ProfileManagement user={user} description="Manage your administrative profile and account settings" />;
  }

  return <div className="text-slate-500 italic p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
    This module is under development.
  </div>;
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center p-6">
          <div className={`${color} p-4 rounded-2xl text-white mr-4`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
