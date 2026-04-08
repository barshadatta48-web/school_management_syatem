import { useState, useEffect } from 'react';
import { db, UserProfile, OperationType, handleFirestoreError, ClassData, AttendanceRecord, GradeRecord, Exam, Announcement } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, setDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Check, X, Calendar, GraduationCap, BrainCircuit, Loader2, Save, Megaphone, BookOpen, Users } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../lib/utils';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExam, setGeneratedExam] = useState<any>(null);
  const [savedExams, setSavedExams] = useState<Exam[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);

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
        contents: `Generate a 5-question multiple choice exam for the subject "${selectedClass.name}" on the topic "${examTopic}".`,
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
        createdAt: new Date().toISOString()
      });
      toast.success("Exam saved and assigned to class");
      setGeneratedExam(null);
      setExamTopic('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'exams');
    }
  };

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
                  <CardTitle>{generatedExam.title}</CardTitle>
                  <Button size="sm" onClick={saveExam}>
                    <Save className="h-4 w-4 mr-2" /> Save & Assign
                  </Button>
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
              <CardHeader>
                <CardTitle>Assigned Exams</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedExams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.title}</TableCell>
                        <TableCell>{exam.subject}</TableCell>
                        <TableCell>{exam.questions.length}</TableCell>
                        <TableCell>{new Date(exam.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Manage your professional information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                {user.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold">{user.name}</h3>
                <p className="text-slate-500">{user.email}</p>
                <Badge className="mt-2">Faculty Member</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={user.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={user.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Assigned Classes</Label>
                <Input value={classes.length} disabled />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value="Teacher" disabled />
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

  return <div className="text-slate-500 italic">Module coming soon...</div>;
}
