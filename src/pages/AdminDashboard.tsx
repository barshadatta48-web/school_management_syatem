import { useState, useEffect } from 'react';
import { db, UserProfile, OperationType, handleFirestoreError, ClassData } from '../lib/firebase';
import { collection, query, onSnapshot, updateDoc, doc, addDoc, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Users, BookOpen, GraduationCap, ShieldAlert, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AdminDashboardProps {
  activeTab: string;
}

export default function AdminDashboard({ activeTab }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [newClass, setNewClass] = useState({ name: '', section: '', teacherId: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    teachers: 0,
    students: 0,
    classes: 0
  });

  useEffect(() => {
    const usersUnsubscribe = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    });

    const classesUnsubscribe = onSnapshot(query(collection(db, 'classes')), (snapshot) => {
      const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData));
      setClasses(classesData);
    });

    return () => {
      usersUnsubscribe();
      classesUnsubscribe();
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

  if (activeTab === 'overview') {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="bg-blue-500" />
          <StatCard title="Teachers" value={stats.teachers} icon={ShieldAlert} color="bg-purple-500" />
          <StatCard title="Students" value={stats.students} icon={GraduationCap} color="bg-green-500" />
          <StatCard title="Classes" value={stats.classes} icon={BookOpen} color="bg-orange-500" />
        </div>
        {/* ... rest of overview ... */}
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
    return (
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
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
              {users.map((user) => (
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
            <Card key={cls.id} className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {cls.name}
                  <Badge>{cls.section}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Teacher:</span>
                  <span className="font-medium">{users.find(u => u.uid === cls.teacherId)?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Students:</span>
                  <span className="font-medium">{cls.studentIds.length} enrolled</span>
                </div>
                <div className="pt-4 border-t">
                  <Label className="text-xs uppercase text-slate-400 mb-2 block">Assign Student</Label>
                  <Select onValueChange={(val: string) => assignStudentToClass(cls.id, val)}>
                    <SelectTrigger>
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

  return <div className="text-slate-500 italic">Module coming soon...</div>;
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
