import { useState, useEffect } from 'react';
import { db, UserProfile, OperationType, handleFirestoreError, ClassData, Announcement, AttendanceRecord, GradeRecord } from '../lib/firebase';
import { collection, query, onSnapshot, updateDoc, doc, addDoc, getDocs, deleteDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Users, BookOpen, GraduationCap, ShieldAlert, Plus, X, Megaphone, Trash2, Search, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminDashboardProps {
  activeTab: string;
}

export default function AdminDashboard({ activeTab }: AdminDashboardProps) {
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
  const [searchTerm, setSearchTerm] = useState('');

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

    return () => {
      usersUnsubscribe();
      classesUnsubscribe();
      announcementsUnsubscribe();
      attendanceUnsubscribe();
      gradesUnsubscribe();
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
      toast.success("Announcement posted");
      setIsAnnounceDialogOpen(false);
      setNewAnnouncement({ title: '', content: '', priority: 'medium' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
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

  if (activeTab === 'overview') {
    const chartData = [
      { name: 'Students', value: stats.students, color: '#22c55e' },
      { name: 'Teachers', value: stats.teachers, color: '#a855f7' },
      { name: 'Admins', value: users.filter(u => u.role === 'admin').length, color: '#ef4444' }
    ];

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
              <Badge variant="outline" className="bg-white">System Logs</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { user: 'Sarah Wilson', action: 'submitted Midterm grades', time: '2 mins ago', icon: GraduationCap, color: 'text-green-500' },
                  { user: 'Admin', action: 'posted new announcement', time: '15 mins ago', icon: Megaphone, color: 'text-orange-500' },
                  { user: 'John Doe', action: 'marked attendance for Math 101', time: '1 hour ago', icon: CalendarCheck, color: 'text-blue-500' },
                  { user: 'System', action: 'new student registered', time: '3 hours ago', icon: Users, color: 'text-purple-500' },
                ].map((activity, idx) => (
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
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Announcements</CardTitle>
              <Dialog open={isAnnounceDialogOpen} onOpenChange={setIsAnnounceDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="h-4 w-4" /></Button>
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
                      defaultValue={user.role} 
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
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Create Class</Button>
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
                  <Select onValueChange={val => setNewClass({...newClass, teacherId: val})}>
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
                  <Select onValueChange={(val: string) => assignStudentToClass(cls.id, val)}>
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
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>School-wide Attendance</CardTitle>
          <CardDescription>Average attendance rate per class</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classAttendance.map((cls) => (
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (activeTab === 'grades') {
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
        totalExams: new Set(records.map(r => r.examName)).size
      };
    });

    return (
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
                <TableHead>Exams Held</TableHead>
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
                  <TableCell>{cls.totalExams}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (activeTab === 'profile') {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                {users.find(u => u.role === 'admin')?.name.charAt(0) || 'A'}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold">{users.find(u => u.role === 'admin')?.name}</h3>
                <p className="text-slate-500">{users.find(u => u.role === 'admin')?.email}</p>
                <Badge className="mt-2">Administrator</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={users.find(u => u.role === 'admin')?.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={users.find(u => u.role === 'admin')?.email} disabled />
              </div>
            </div>
            
            <div className="pt-6 border-t">
              <p className="text-xs text-slate-400 italic">Profile editing is managed via your Google Account.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
