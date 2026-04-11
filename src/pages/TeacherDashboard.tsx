import { useState, useEffect } from 'react';
import { db, UserProfile, OperationType, handleFirestoreError, ClassData, AttendanceRecord, GradeRecord, Exam, Announcement, sendNotification } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, setDoc, orderBy, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Check, X, Calendar, GraduationCap, BrainCircuit, Loader2, Save, Megaphone, BookOpen, Users, Eye, Trash2, Info, CheckCircle2, Sparkles, Wand2, Clock, TrendingUp } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../lib/utils';
import ProfileManagement from '../components/ProfileManagement';

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classGrades, setClassGrades] = useState<GradeRecord[]>([]);
  
  // Exam Generation State
  const [examTopic, setExamTopic] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExam, setGeneratedExam] = useState<any>(null);
  const [savedExams, setSavedExams] = useState<Exam[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [viewingExam, setViewingExam] = useState<Exam | null>(null);

  // Attendance Management State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);

  // AI Grade Suggestion State
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedGrades, setSuggestedGrades] = useState<Record<string, number>>({});

  // Exam Filter State
  const [examFilter, setExamFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');

  useEffect(() => {
    const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    });

    const announcementsUnsubscribe = onSnapshot(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
    });

    return () => {
      unsubscribe();
      announcementsUnsubscribe();
    };
  }, [user.uid]);

  useEffect(() => {
    if (selectedClass) {
      const q = query(collection(db, 'grades'), where('classId', '==', selectedClass.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setClassGrades(snapshot.docs.map(doc => doc.data() as GradeRecord));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'grades');
      });
      return () => unsubscribe();
    }
  }, [selectedClass]);

  useEffect(() => {
    const q = query(collection(db, 'exams'), where('teacherId', '==', user.uid));
    const examsUnsubscribe = onSnapshot(q, (snapshot) => {
      setSavedExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'exams');
    });

    const studentsUnsubscribe = onSnapshot(query(collection(db, 'users'), where('role', '==', 'student')), (snapshot) => {
      setAllStudents(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => {
      examsUnsubscribe();
      studentsUnsubscribe();
    };
  }, [user.uid]);

  useEffect(() => {
    if (selectedClass) {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const allStudents = snapshot.docs.map(doc => doc.data() as UserProfile);
        setStudents(allStudents.filter(s => selectedClass.studentIds.includes(s.uid)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
      return () => unsubscribe();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && attendanceDate) {
      const attendanceId = `${selectedClass.id}_${attendanceDate}`;
      const unsubscribe = onSnapshot(doc(db, 'attendance', attendanceId), (doc) => {
        if (doc.exists()) {
          setCurrentAttendance(doc.data() as AttendanceRecord);
        } else {
          setCurrentAttendance(null);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `attendance/${attendanceId}`);
      });
      return () => unsubscribe();
    }
  }, [selectedClass, attendanceDate]);

  const generateExam = async () => {
    if (!examTopic || !selectedClass) {
      toast.error("Please select a class and enter a topic");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a 5-question multiple choice exam for the subject "${selectedClass.name}" on the topic "${examTopic}". 
        The exam should be challenging but fair for students. 
        Each question must have exactly 4 options and one clearly identified correct answer.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING }
                  },
                  required: ["question", "options", "correctAnswer"]
                }
              }
            },
            required: ["title", "questions"]
          }
        }
      });

      const examData = JSON.parse(response.text);
      setGeneratedExam(examData);
      toast.success("Exam generated successfully!");
    } catch (error) {
      console.error("Exam Generation Error:", error);
      toast.error("Failed to generate exam");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveExam = async () => {
    if (!generatedExam || !selectedClass) return;

    try {
      const examId = `exam_${Date.now()}`;
      await setDoc(doc(db, 'exams', examId), {
        id: examId,
        title: generatedExam.title,
        subject: selectedClass.name,
        classId: selectedClass.id,
        teacherId: user.uid,
        questions: generatedExam.questions,
        createdAt: new Date().toISOString(),
        scheduledDate: scheduledDate || new Date().toISOString(),
        status: 'upcoming'
      });

      // Send notifications to all students in the class
      if (selectedClass.studentIds) {
        for (const studentId of selectedClass.studentIds) {
          await sendNotification({
            userId: studentId,
            title: 'New Exam Assigned',
            message: `A new exam "${generatedExam.title}" has been assigned for your class.`,
            type: 'info'
          });
        }
      }

      toast.success("Exam saved and assigned to class");
      setGeneratedExam(null);
      setExamTopic('');
      setScheduledDate('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'exams');
    }
  };

  const markAttendance = async (studentId: string, status: 'present' | 'absent') => {
    if (!selectedClass) return;
    const attendanceId = `${selectedClass.id}_${attendanceDate}`;
    
    try {
      const attendanceRef = doc(db, 'attendance', attendanceId);
      await setDoc(attendanceRef, {
        id: attendanceId,
        classId: selectedClass.id,
        date: attendanceDate,
        records: { [studentId]: status }
      }, { merge: true });
      toast.success(`Marked ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${attendanceId}`);
    }
  };

  const markAllPresent = async () => {
    if (!selectedClass || students.length === 0) return;
    const attendanceId = `${selectedClass.id}_${attendanceDate}`;
    const records: Record<string, 'present' | 'absent'> = {};
    students.forEach(s => {
      records[s.uid] = 'present';
    });

    try {
      const attendanceRef = doc(db, 'attendance', attendanceId);
      await setDoc(attendanceRef, {
        id: attendanceId,
        classId: selectedClass.id,
        date: attendanceDate,
        records
      }, { merge: true });
      toast.success("All students marked present");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${attendanceId}`);
    }
  };

  const submitGrade = async (studentId: string, score: number) => {
    if (!selectedClass) return;
    const gradeId = `grade_${selectedClass.id}_${studentId}_${Date.now()}`;
    try {
      await setDoc(doc(db, 'grades', gradeId), {
        id: gradeId,
        studentId,
        classId: selectedClass.id,
        examName: 'Final Result',
        score,
        totalScore,
        date: new Date().toISOString()
      });

      // Send notification to student
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

  const updateExamStatus = async (examId: string, newStatus: 'upcoming' | 'ongoing' | 'completed') => {
    try {
      await updateDoc(doc(db, 'exams', examId), { status: newStatus });
      toast.success(`Exam status updated to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `exams/${examId}`);
    }
  };

  const suggestGrades = async () => {
    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }

    setIsSuggesting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Prepare student performance data for the prompt
      const performanceData = students.map(student => {
        const studentPastGrades = classGrades.filter(g => g.studentId === student.uid);
        const history = studentPastGrades.map(g => ({
          exam: g.examName,
          percentage: Math.round((g.score / g.totalScore) * 100)
        }));
        return {
          id: student.uid,
          name: student.name,
          history
        };
      });

      const prompt = `As an AI teaching assistant, suggest grades for the following students for their latest exam in "${selectedClass.name}" with a total score of ${totalScore}.
      Base your suggestions on their past performance history provided below.
      Be realistic - if a student consistently gets 80%, suggest something around that range, but allow for slight variation.
      
      Student Data:
      ${JSON.stringify(performanceData, null, 2)}
      
      Return the suggestions as a JSON object where keys are student IDs and values are the suggested numeric scores (not percentages).
      Example: {"student_uid_1": 85, "student_uid_2": 72}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            additionalProperties: { type: Type.NUMBER }
          }
        }
      });

      const suggestions = JSON.parse(response.text) as Record<string, number>;
      setSuggestedGrades(suggestions);
      toast.success("AI suggestions generated! Review them in the table.");
    } catch (error) {
      console.error("AI Suggestion Error:", error);
      toast.error("Failed to generate AI suggestions");
    } finally {
      setIsSuggesting(false);
    }
  };

  const applyAllSuggestions = () => {
    Object.entries(suggestedGrades).forEach(([studentId, score]) => {
      submitGrade(studentId, score as number);
    });
    setSuggestedGrades({});
    toast.success("All AI suggestions applied and saved");
  };

  const deleteExam = async (examId: string) => {
    try {
      await deleteDoc(doc(db, 'exams', examId));
      toast.success("Exam deleted");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `exams/${examId}`);
    }
  };

  if (activeTab === 'overview') {
    const gradeDistribution = [
      { range: '90-100', count: classGrades.filter(g => (g.score/g.totalScore) >= 0.9).length, color: '#22c55e' },
      { range: '80-89', count: classGrades.filter(g => (g.score/g.totalScore) >= 0.8 && (g.score/g.totalScore) < 0.9).length, color: '#3b82f6' },
      { range: '70-79', count: classGrades.filter(g => (g.score/g.totalScore) >= 0.7 && (g.score/g.totalScore) < 0.8).length, color: '#eab308' },
      { range: '60-69', count: classGrades.filter(g => (g.score/g.totalScore) >= 0.6 && (g.score/g.totalScore) < 0.7).length, color: '#f97316' },
      { range: '< 60', count: classGrades.filter(g => (g.score/g.totalScore) < 0.6).length, color: '#ef4444' },
    ];

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Your Classes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {classes.map((cls) => (
                <Card 
                  key={cls.id} 
                  className={cn(
                    "border-none shadow-sm hover:shadow-md transition-all cursor-pointer",
                    selectedClass?.id === cls.id ? "ring-2 ring-primary bg-primary/5" : ""
                  )} 
                  onClick={() => setSelectedClass(cls)}
                >
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {cls.name}
                      <Badge variant={selectedClass?.id === cls.id ? "default" : "outline"}>{cls.section}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500">{cls.studentIds.length} Students enrolled</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedClass && (
              <div className="space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Grade Distribution: {selectedClass.name}</CardTitle>
                    <CardDescription>Performance breakdown for the selected class</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {gradeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Class Grades: {selectedClass.name}</CardTitle>
                    <CardDescription>All recorded grades for this class</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Exam</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Percentage</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classGrades.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                              No grades recorded for this class yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          classGrades.map((grade, idx) => {
                            const student = students.find(s => s.uid === grade.studentId);
                            const percentage = Math.round((grade.score / grade.totalScore) * 100);
                            return (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{student?.name || 'Unknown Student'}</TableCell>
                                <TableCell>{grade.examName}</TableCell>
                                <TableCell>{grade.score} / {grade.totalScore}</TableCell>
                                <TableCell>
                                  <Badge variant={percentage >= 80 ? 'default' : percentage >= 60 ? 'secondary' : 'destructive'}>
                                    {percentage}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-slate-500 text-xs">
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
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => setSelectedClass(classes[0])}>
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase">Mark Attendance</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => setSelectedClass(classes[0])}>
                  <GraduationCap className="h-5 w-5 text-green-500" />
                  <span className="text-[10px] font-bold uppercase">Submit Grades</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => {}}>
                  <BrainCircuit className="h-5 w-5 text-purple-500" />
                  <span className="text-[10px] font-bold uppercase">AI Exam Gen</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => {}}>
                  <Megaphone className="h-5 w-5 text-orange-500" />
                  <span className="text-[10px] font-bold uppercase">Post Update</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Class Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">No classes assigned</p>
                  ) : (
                    classes.map(cls => {
                      const grades = classGrades.filter(g => g.classId === cls.id);
                      const avg = grades.length > 0 
                        ? Math.round(grades.reduce((acc, g) => acc + (g.score / g.totalScore), 0) / grades.length * 100)
                        : 0;
                      return (
                        <div key={cls.id} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>{cls.name}</span>
                            <span>{avg}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                avg >= 80 ? "bg-green-500" : avg >= 60 ? "bg-blue-500" : "bg-red-500"
                              )}
                              style={{ width: `${avg}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-purple-500" />
                  Active Exams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {savedExams.filter(e => e.status !== 'completed').slice(0, 3).length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">No active exams</p>
                  ) : (
                    savedExams.filter(e => e.status !== 'completed').slice(0, 3).map(exam => (
                      <div key={exam.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                          <h4 className="font-bold text-xs">{exam.title}</h4>
                          <p className="text-[10px] text-slate-400">{exam.subject}</p>
                        </div>
                        <Badge variant={exam.status === 'ongoing' ? 'default' : 'outline'} className="text-[10px]">
                          {exam.status}
                        </Badge>
                      </div>
                    ))
                  )}
                  <Button variant="ghost" className="w-full text-xs text-primary" onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'exams' }))}>
                    Manage Exams
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-orange-500" />
                  School Announcements
                </CardTitle>
              </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
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
                    <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {ann.authorName.charAt(0)}
                      </div>
                      <span className="text-[10px] text-slate-400">Posted by {ann.authorName}</span>
                    </div>
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

  if (activeTab === 'attendance') {
    return (
      <div className="space-y-6">
        {!selectedClass ? (
          <div className="text-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-6">Select a class to mark attendance</p>
            <div className="max-w-xs mx-auto">
              <select 
                className="w-full p-2 rounded-md border border-slate-200 text-sm"
                value={selectedClass?.id || ''}
                onChange={(e) => setSelectedClass(classes.find(c => c.id === e.target.value) || null)}
              >
                <option value="">Choose a class...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-slate-900">Mark Attendance</CardTitle>
                <CardDescription>Record daily presence for your students</CardDescription>
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
                <Button variant="outline" size="sm" className="mt-5" onClick={() => setSelectedClass(null)}>Back</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Subject Name</Label>
                  <p className="font-bold text-slate-700">{selectedClass.name} - {selectedClass.section}</p>
                </div>
                <div className="flex items-end justify-end">
                  <Button size="sm" onClick={markAllPresent} className="bg-blue-600 hover:bg-blue-700">
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
                  {students.map((student) => {
                    const status = currentAttendance?.records[student.uid];
                    return (
                      <TableRow key={student.uid}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                              {student.name.charAt(0)}
                            </div>
                            {student.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-4">
                            <button 
                              onClick={() => markAttendance(student.uid, 'present')}
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
                              onClick={() => markAttendance(student.uid, 'absent')}
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
            <p className="text-slate-500 mb-6">Select a class to manage grades</p>
            <div className="max-w-xs mx-auto">
              <select 
                className="w-full p-2 rounded-md border border-slate-200 text-sm"
                value={selectedClass?.id || ''}
                onChange={(e) => setSelectedClass(classes.find(c => c.id === e.target.value) || null)}
              >
                <option value="">Choose a class...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Grades: {selectedClass.name}</CardTitle>
                <CardDescription>Manage and post student grades</CardDescription>
              </div>
              <div className="flex gap-2">
                {Object.keys(suggestedGrades).length > 0 && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={applyAllSuggestions}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Apply All AI Suggestions
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  onClick={suggestGrades}
                  disabled={isSuggesting || !examName}
                >
                  {isSuggesting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Suggest with AI</>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedClass(null)}>Back</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
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
                  {students.map((student) => {
                    const latestGrade = [...classGrades]
                      .filter(g => g.studentId === student.uid)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    return (
                      <TableRow key={student.uid}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Input 
                              key={`${student.uid}_${suggestedGrades[student.uid] || ''}`}
                              type="number" 
                              className={cn(
                                "w-24",
                                suggestedGrades[student.uid] !== undefined && !latestGrade && "border-purple-300 bg-purple-50"
                              )} 
                              placeholder="Score" 
                              defaultValue={latestGrade?.score ?? suggestedGrades[student.uid]}
                              onBlur={(e) => {
                                const val = e.target.value === '' ? NaN : Number(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  submitGrade(student.uid, val);
                                }
                              }}
                            />
                            {suggestedGrades[student.uid] !== undefined && !latestGrade && (
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">
                                  AI: {suggestedGrades[student.uid]}
                                </Badge>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 text-green-600"
                                  onClick={() => {
                                    submitGrade(student.uid, suggestedGrades[student.uid]);
                                    const newSuggestions = { ...suggestedGrades };
                                    delete newSuggestions[student.uid];
                                    setSuggestedGrades(newSuggestions);
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {latestGrade ? (
                              <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                                Last: {latestGrade.score}/{latestGrade.totalScore}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Not entered</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (activeTab === 'exams') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-none shadow-sm h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-purple-500" />
                AI Exam Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Class</Label>
                <select 
                  className="w-full p-2 rounded-md border border-slate-200 text-sm"
                  value={selectedClass?.id || ''}
                  onChange={(e) => setSelectedClass(classes.find(c => c.id === e.target.value) || null)}
                >
                  <option value="">Choose a class...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Topic / Subject Matter</Label>
                <Input 
                  placeholder="e.g. Photosynthesis, Algebra Basics" 
                  value={examTopic}
                  onChange={e => setExamTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Input 
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                />
              </div>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700" 
                onClick={generateExam}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  'Generate Exam'
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            {generatedExam && (
              <Card className="border-2 border-purple-100 shadow-md bg-purple-50/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{generatedExam.title}</CardTitle>
                    {scheduledDate && (
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        Scheduled for: {new Date(scheduledDate).toLocaleDateString()}
                      </CardDescription>
                    )}
                  </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setGeneratedExam(null)}>
                    Discard
                  </Button>
                  <Button size="sm" onClick={saveExam} className="bg-purple-600 hover:bg-purple-700">
                    <Save className="h-4 w-4 mr-2" /> Save & Assign
                  </Button>
                </div>
              </CardHeader>
                <CardContent className="space-y-4">
                  {generatedExam.questions.map((q: any, idx: number) => (
                    <div key={idx} className="p-4 bg-white rounded-lg border border-purple-100">
                      <p className="font-medium mb-2">{idx + 1}. {q.question}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt: string, oIdx: number) => (
                          <div key={oIdx} className={`text-sm p-2 rounded border ${opt === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-100'}`}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Assigned Exams</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Filter:</span>
                  <select 
                    className="text-xs p-1.5 rounded-md border border-slate-200 bg-white"
                    value={examFilter}
                    onChange={(e) => setExamFilter(e.target.value as any)}
                  >
                    <option value="all">All Status</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Title</TableHead>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedExams.filter(exam => examFilter === 'all' || exam.status === examFilter).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                          <BrainCircuit className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                          No exams found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      savedExams
                        .filter(exam => examFilter === 'all' || exam.status === examFilter)
                        .map((exam) => (
                          <TableRow key={exam.id}>
                            <TableCell className="font-medium">{exam.title}</TableCell>
                            <TableCell>{exam.subject}</TableCell>
                            <TableCell>{exam.questions.length}</TableCell>
                            <TableCell>
                              <div className="relative inline-block">
                                <select 
                                  className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full border-none cursor-pointer focus:ring-2 focus:ring-offset-1 appearance-none transition-colors",
                                    exam.status === 'completed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 
                                    exam.status === 'ongoing' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 
                                    'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                  )}
                                  value={exam.status}
                                  onChange={(e) => updateExamStatus(exam.id, e.target.value as any)}
                                >
                                  <option value="upcoming" className="bg-white text-slate-900">Upcoming</option>
                                  <option value="ongoing" className="bg-white text-slate-900">Ongoing</option>
                                  <option value="completed" className="bg-white text-slate-900">Completed</option>
                                </select>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {exam.scheduledDate ? new Date(exam.scheduledDate).toLocaleDateString() : new Date(exam.createdAt).toLocaleDateString()}
                                </span>
                                {exam.scheduledDate && (
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                                    Scheduled
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setViewingExam(exam)}>
                                  <Eye className="h-4 w-4 text-slate-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteExam(exam.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {viewingExam && (
              <Dialog open={!!viewingExam} onOpenChange={() => setViewingExam(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{viewingExam.title}</DialogTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created: {new Date(viewingExam.createdAt).toLocaleDateString()}
                      </span>
                      {viewingExam.scheduledDate && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Clock className="h-3 w-3" />
                          Scheduled: {new Date(viewingExam.scheduledDate).toLocaleDateString()}
                        </span>
                      )}
                    </CardDescription>
                  </DialogHeader>
                  <div className="space-y-6 mt-4">
                    {viewingExam.questions.map((q, idx) => (
                      <div key={idx} className="space-y-3">
                        <p className="font-medium">{idx + 1}. {q.question}</p>
                        <div className="grid grid-cols-1 gap-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className={cn(
                              "p-3 rounded-lg border text-sm",
                              opt === q.correctAnswer ? "bg-green-50 border-green-200 text-green-700 font-medium" : "bg-slate-50 border-slate-100"
                            )}>
                              {opt} {opt === q.correctAnswer && "(Correct Answer)"}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'students') {
    const teacherStudents = allStudents.filter(s => 
      classes.some(cls => cls.studentIds.includes(s.uid))
    );

    return (
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>My Students</CardTitle>
          <CardDescription>All students enrolled in your classes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Enrolled Classes</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacherStudents.map((student) => {
                const studentClasses = classes.filter(c => c.studentIds.includes(student.uid));
                const studentGrades = classGrades.filter(g => g.studentId === student.uid);
                const avg = studentGrades.length > 0 
                  ? Math.round(studentGrades.reduce((acc, g) => acc + (g.score / g.totalScore), 0) / studentGrades.length * 100)
                  : 0;

                return (
                  <TableRow key={student.uid}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {studentClasses.map(c => (
                          <Badge key={c.id} variant="outline" className="text-[10px]">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={avg >= 80 ? 'default' : avg >= 60 ? 'secondary' : 'destructive'}>
                        {avg > 0 ? `${avg}%` : 'N/A'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (activeTab === 'profile') {
    return <ProfileManagement user={user} description="Manage your professional profile and contact details" />;
  }

  return <div className="text-slate-500 italic">Module coming soon...</div>;
}
