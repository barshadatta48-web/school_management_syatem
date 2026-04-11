import { useState, useEffect } from 'react';
import { db, UserProfile, OperationType, handleFirestoreError, GradeRecord, AttendanceRecord, Exam, ClassData, Announcement } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, setDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { GraduationCap, Calendar, TrendingUp, BookOpen, Megaphone, Clock, ExternalLink, Users, BrainCircuit, CalendarCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';

import ProfileManagement from '../components/ProfileManagement';

interface StudentDashboardProps {
  activeTab: string;
  user: UserProfile;
}

export default function StudentDashboard({ activeTab, user }: StudentDashboardProps) {
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const gradesQ = query(collection(db, 'grades'), where('studentId', '==', user.uid));
    const unsubscribeGrades = onSnapshot(gradesQ, (snapshot) => {
      setGrades(snapshot.docs.map(doc => doc.data() as GradeRecord));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'grades');
    });

    const attendanceQ = query(collection(db, 'attendance'), orderBy('date', 'asc'));
    const unsubscribeAttendance = onSnapshot(attendanceQ, (snapshot) => {
      const allAttendance = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
      setAttendance(allAttendance.filter(a => a.records[user.uid]));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    });

    const announcementsUnsubscribe = onSnapshot(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
    });

    const classesQ = query(collection(db, 'classes'), where('studentIds', 'array-contains', user.uid));
    const unsubscribeClasses = onSnapshot(classesQ, (snapshot) => {
      const studentClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData));
      setClasses(studentClasses);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    });

    return () => {
      unsubscribeGrades();
      unsubscribeAttendance();
      unsubscribeClasses();
      announcementsUnsubscribe();
    };
  }, [user.uid]);

  useEffect(() => {
    if (classes.length > 0) {
      const classIds = classes.map(c => c.id);
      const examsQ = query(collection(db, 'exams'), where('classId', 'in', classIds));
      const unsubscribeExams = onSnapshot(examsQ, (snapshot) => {
        setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'exams');
      });
      return () => unsubscribeExams();
    }
  }, [classes]);

  const submitExam = async () => {
    if (!activeExam) return;
    
    setIsSubmitting(true);
    try {
      let score = 0;
      activeExam.questions.forEach((q, idx) => {
        if (examAnswers[idx] === q.correctAnswer) {
          score++;
        }
      });

      const gradeId = `${activeExam.classId}_${user.uid}_${activeExam.id}`;
      await setDoc(doc(db, 'grades', gradeId), {
        id: gradeId,
        studentId: user.uid,
        classId: activeExam.classId,
        examName: activeExam.title,
        score: score,
        totalScore: activeExam.questions.length,
        date: new Date().toISOString()
      });

      toast.success(`Exam submitted! Your score: ${score}/${activeExam.questions.length}`);
      setActiveExam(null);
      setExamAnswers({});
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'grades');
      toast.error("Failed to submit exam");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeExam) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{activeExam.title}</h2>
            <p className="text-slate-500">{activeExam.subject}</p>
          </div>
          <Button variant="outline" onClick={() => setActiveExam(null)}>Cancel</Button>
        </div>

        <div className="space-y-6">
          {activeExam.questions.map((q, idx) => (
            <Card key={idx} className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">{idx + 1}. {q.question}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map((opt, oIdx) => (
                  <Button
                    key={oIdx}
                    variant={examAnswers[idx] === opt ? "default" : "outline"}
                    className="justify-start h-auto py-3 px-4 text-left whitespace-normal"
                    onClick={() => setExamAnswers({ ...examAnswers, [idx]: opt })}
                  >
                    {opt}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          className="w-full h-12 text-lg" 
          onClick={submitExam}
          disabled={isSubmitting || Object.keys(examAnswers).length < activeExam.questions.length}
        >
          {isSubmitting ? "Submitting..." : "Submit Exam"}
        </Button>
      </div>
    );
  }

  if (activeTab === 'overview') {
    const totalAttendance = attendance.length;
    const presentCount = attendance.filter(a => a.records[user.uid] === 'present').length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    const attendanceTrend = attendance.slice(-7).map(a => ({
      date: new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      status: a.records[user.uid] === 'present' ? 1 : 0
    }));

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Attendance Trend</CardTitle>
                <CardDescription>Your presence over the last 7 school days</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={(val) => val === 1 ? 'Present' : 'Absent'} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(val) => [val === 1 ? 'Present' : 'Absent', 'Status']}
                    />
                    <Line type="monotone" dataKey="status" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6, fill: '#3b82f6' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

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

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-16 flex flex-col gap-1" onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'schedule' }))}>
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-[10px] uppercase">Schedule</span>
                </Button>
                <Button variant="outline" size="sm" className="h-16 flex flex-col gap-1" onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'grades' }))}>
                  <GraduationCap className="h-4 w-4 text-green-500" />
                  <span className="text-[10px] uppercase">Grades</span>
                </Button>
                <Button variant="outline" size="sm" className="h-16 flex flex-col gap-1" onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'attendance' }))}>
                  <CalendarCheck className="h-4 w-4 text-orange-500" />
                  <span className="text-[10px] uppercase">Attendance</span>
                </Button>
                <Button variant="outline" size="sm" className="h-16 flex flex-col gap-1" onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'resources' }))}>
                  <BookOpen className="h-4 w-4 text-purple-500" />
                  <span className="text-[10px] uppercase">Resources</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-purple-500" />
                  Upcoming Exams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {exams.filter(e => e.status !== 'completed').slice(0, 3).length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">No upcoming exams</p>
                  ) : (
                    exams.filter(e => e.status !== 'completed').slice(0, 3).map(exam => (
                      <div key={exam.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                          <h4 className="font-bold text-xs">{exam.title}</h4>
                          <p className="text-[10px] text-slate-400">{exam.subject}</p>
                        </div>
                        <Badge variant={exam.status === 'ongoing' ? 'default' : 'outline'} className="text-[10px]">
                          {exam.status === 'ongoing' ? 'LIVE' : new Date(exam.scheduledDate).toLocaleDateString()}
                        </Badge>
                      </div>
                    ))
                  )}
                  <Button variant="ghost" className="w-full text-xs text-primary" onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'exams' }))}>
                    View All Exams
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-orange-500" />
                  Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {announcements.map(ann => (
                    <div key={ann.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={ann.priority === 'high' ? 'destructive' : ann.priority === 'medium' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1">
                          {ann.priority}
                        </Badge>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm mb-1">{ann.title}</h4>
                      <p className="text-xs text-slate-500">{ann.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Classmates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank'].map((name, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {name.charAt(0)}
                      </div>
                      <span className="text-xs font-medium">{name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'exams') {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold">Assigned Exams</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.length === 0 ? (
            <div className="col-span-full text-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No exams assigned yet</p>
            </div>
          ) : (
            exams.map((exam) => {
              const hasTaken = grades.some(g => g.examName === exam.title);
              return (
                <Card key={exam.id} className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {exam.title}
                      <Badge variant={exam.status === 'completed' ? 'secondary' : exam.status === 'ongoing' ? 'default' : 'outline'}>
                        {exam.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{exam.subject}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {exam.scheduledDate ? new Date(exam.scheduledDate).toLocaleDateString() : 'TBD'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {exam.questions.length} Questions
                      </div>
                    </div>
                    <div className="pt-4 border-t flex justify-between items-center">
                      <span className="text-xs text-slate-400">Assigned: {new Date(exam.createdAt).toLocaleDateString()}</span>
                      <Button 
                        size="sm" 
                        variant={hasTaken ? "secondary" : "default"} 
                        onClick={() => setActiveExam(exam)}
                        disabled={hasTaken || exam.status === 'completed'}
                      >
                        {hasTaken ? "Completed" : "Take Exam"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'attendance') {
    const totalAttendance = attendance.length;
    const presentCount = attendance.filter(a => a.records[user.uid] === 'present').length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-900">My Attendance</h3>
            <p className="text-slate-500">Track your daily presence across all classes</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Overall Rate</p>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      attendanceRate >= 75 ? "bg-green-500" : attendanceRate >= 50 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
                <p className="text-2xl font-bold text-primary">{attendanceRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                      <Calendar className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...attendance].reverse().map((record) => {
                    const cls = classes.find(c => c.id === record.classId);
                    const status = record.records[user.uid];
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{cls?.name || 'Unknown Class'}</TableCell>
                        <TableCell>
                          {new Date(record.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status === 'present' ? 'default' : 'destructive'} className="capitalize">
                            {status}
                          </Badge>
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

  if (activeTab === 'schedule') {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = ['09:00 AM', '10:30 AM', '12:00 PM', '01:30 PM', '03:00 PM'];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Weekly Schedule</h3>
          <Badge variant="outline" className="bg-white">Current Semester</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="hidden md:block pt-12 space-y-12">
            {timeSlots.map(slot => (
              <div key={slot} className="text-[10px] font-bold text-slate-400 uppercase text-right pr-4">
                {slot}
              </div>
            ))}
          </div>
          
          {days.map((day, dIdx) => (
            <div key={day} className="space-y-4">
              <div className="text-center font-bold text-sm text-slate-600 pb-2 border-b border-slate-200">
                {day}
              </div>
              <div className="space-y-3">
                {classes.map((cls, cIdx) => {
                  // Mocking a schedule based on class index and day
                  const isVisible = (cIdx + dIdx) % 3 === 0;
                  if (!isVisible) return null;
                  
                  return (
                    <div key={cls.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-medium text-slate-500">
                          {timeSlots[(cIdx + dIdx) % 5]}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs line-clamp-1">{cls.name}</h4>
                      <p className="text-[10px] text-slate-400">Room {101 + cIdx}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'resources') {
    const resources = [
      { title: 'Mathematics Study Guide', type: 'PDF', size: '2.4 MB', category: 'Math' },
      { title: 'History Lecture Notes', type: 'DOCX', size: '1.1 MB', category: 'History' },
      { title: 'Physics Lab Manual', type: 'PDF', size: '5.8 MB', category: 'Science' },
      { title: 'English Literature Analysis', type: 'PDF', size: '3.2 MB', category: 'English' },
    ];

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold">Learning Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res, idx) => (
            <Card key={idx} className="border-none shadow-sm group hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-slate-50 p-3 rounded-xl group-hover:bg-primary/10 transition-colors">
                    <BookOpen className="h-6 w-6 text-slate-400 group-hover:text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{res.category}</Badge>
                </div>
                <h4 className="font-bold mb-1">{res.title}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-6">
                  <span>{res.type}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>{res.size}</span>
                </div>
                <Button variant="outline" className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" /> View Resource
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'grades') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Academic Records</h3>
            <p className="text-slate-500">View your performance across all exams</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Average Score</p>
            <p className="text-xl font-bold text-primary">
              {grades.length > 0 ? Math.round(grades.reduce((acc, g) => acc + (g.score / g.totalScore), 0) / grades.length * 100) : 0}%
            </p>
          </div>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Exam Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                      <GraduationCap className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      No grades recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...grades].reverse().map((grade) => {
                    const cls = classes.find(c => c.id === grade.classId);
                    const percentage = Math.round((grade.score / grade.totalScore) * 100);
                    return (
                      <TableRow key={grade.id}>
                        <TableCell className="font-medium">{grade.examName}</TableCell>
                        <TableCell>{cls?.name || 'Unknown'}</TableCell>
                        <TableCell>{grade.score} / {grade.totalScore}</TableCell>
                        <TableCell>
                          <Badge variant={percentage >= 70 ? 'default' : 'destructive'}>
                            {percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {new Date(grade.date).toLocaleDateString()}
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
    return <ProfileManagement user={user} description="Manage your student profile and contact details" />;
  }

  return <div className="text-slate-500 italic">Module coming soon...</div>;
}
