import { useState, useEffect } from 'react';
import { db, UserProfile, OperationType, handleFirestoreError, GradeRecord, AttendanceRecord } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { GraduationCap, Calendar, TrendingUp } from 'lucide-react';

interface StudentDashboardProps {
  activeTab: string;
  user: UserProfile;
}

export default function StudentDashboard({ activeTab, user }: StudentDashboardProps) {
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const gradesQ = query(collection(db, 'grades'), where('studentId', '==', user.uid));
    const unsubscribeGrades = onSnapshot(gradesQ, (snapshot) => {
      setGrades(snapshot.docs.map(doc => doc.data() as GradeRecord));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'grades');
    });

    const attendanceQ = query(collection(db, 'attendance'));
    const unsubscribeAttendance = onSnapshot(attendanceQ, (snapshot) => {
      const allAttendance = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
      setAttendance(allAttendance.filter(a => a.records[user.uid]));
    });

    return () => {
      unsubscribeGrades();
      unsubscribeAttendance();
    };
  }, [user.uid]);

  if (activeTab === 'overview') {
    const totalAttendance = attendance.length;
    const presentCount = attendance.filter(a => a.records[user.uid] === 'present').length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500 p-3 rounded-xl text-white">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Attendance Rate</p>
                  <h3 className="text-2xl font-bold">{attendanceRate}%</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-500 p-3 rounded-xl text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Average Score</p>
                  <h3 className="text-2xl font-bold">
                    {grades.length > 0 ? Math.round(grades.reduce((acc, g) => acc + (g.score / g.totalScore), 0) / grades.length * 100) : 0}%
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-purple-500 p-3 rounded-xl text-white">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Exams Taken</p>
                  <h3 className="text-2xl font-bold">{grades.length}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Recent Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell className="font-medium">{grade.examName}</TableCell>
                    <TableCell>{grade.score} / {grade.totalScore}</TableCell>
                    <TableCell>
                      <Badge variant={grade.score / grade.totalScore >= 0.7 ? 'default' : 'destructive'}>
                        {Math.round((grade.score / grade.totalScore) * 100)}%
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(grade.date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div className="text-slate-500 italic">Module coming soon...</div>;
}
