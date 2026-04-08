import { useState, useEffect } from 'react';
import { db, UserProfile, OperationType, handleFirestoreError, ClassData, AttendanceRecord, GradeRecord } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Check, X, Calendar, GraduationCap } from 'lucide-react';

interface TeacherDashboardProps {
  activeTab: string;
  user: UserProfile;
}

export default function TeacherDashboard({ activeTab, user }: TeacherDashboardProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [examName, setExamName] = useState('');
  const [totalScore, setTotalScore] = useState(100);

  useEffect(() => {
    const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    });

    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (selectedClass) {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const allStudents = snapshot.docs.map(doc => doc.data() as UserProfile);
        setStudents(allStudents.filter(s => selectedClass.studentIds.includes(s.uid)));
      });
      return () => unsubscribe();
    }
  }, [selectedClass]);

  const markAttendance = async (studentId: string, status: 'present' | 'absent') => {
    if (!selectedClass) return;
    const date = new Date().toISOString().split('T')[0];
    const attendanceId = `${selectedClass.id}_${date}`;
    
    try {
      const attendanceRef = doc(db, 'attendance', attendanceId);
      await setDoc(attendanceRef, {
        id: attendanceId,
        classId: selectedClass.id,
        date,
        records: { [studentId]: status }
      }, { merge: true });
      toast.success(`Marked ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${attendanceId}`);
    }
  };

  const submitGrade = async (studentId: string, score: number) => {
    if (!selectedClass || !examName) {
      toast.error("Please enter exam name");
      return;
    }
    const gradeId = `${selectedClass.id}_${studentId}_${examName.replace(/\s+/g, '_')}`;
    try {
      await setDoc(doc(db, 'grades', gradeId), {
        id: gradeId,
        studentId,
        classId: selectedClass.id,
        examName,
        score,
        totalScore,
        date: new Date().toISOString()
      });
      toast.success("Grade submitted");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `grades/${gradeId}`);
    }
  };

  if (activeTab === 'overview') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <Card key={cls.id} className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedClass(cls)}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {cls.name}
                <Badge>{cls.section}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">{cls.studentIds.length} Students enrolled</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (activeTab === 'attendance') {
    return (
      <div className="space-y-6">
        {!selectedClass ? (
          <div className="text-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Select a class from Overview to mark attendance</p>
          </div>
        ) : (
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attendance: {selectedClass.name} ({new Date().toLocaleDateString()})</CardTitle>
              <Button variant="outline" onClick={() => setSelectedClass(null)}>Back</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.uid}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => markAttendance(student.uid, 'present')}>
                          <Check className="h-4 w-4 mr-1" /> Present
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => markAttendance(student.uid, 'absent')}>
                          <X className="h-4 w-4 mr-1" /> Absent
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (activeTab === 'grades') {
    return (
      <div className="space-y-6">
        {!selectedClass ? (
          <div className="text-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Select a class from Overview to manage grades</p>
          </div>
        ) : (
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Grades: {selectedClass.name}</CardTitle>
              <Button variant="outline" onClick={() => setSelectedClass(null)}>Back</Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                <div className="space-y-2">
                  <Label>Exam Name</Label>
                  <Input placeholder="e.g. Midterm 2024" value={examName} onChange={e => setExamName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Total Score</Label>
                  <Input type="number" value={totalScore} onChange={e => setTotalScore(Number(e.target.value))} />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.uid}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24" 
                          placeholder="Score" 
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val >= 0) submitGrade(student.uid, val);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400 italic">Auto-saves on blur</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return <div className="text-slate-500 italic">Module coming soon...</div>;
}
