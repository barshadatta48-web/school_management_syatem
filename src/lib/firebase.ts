import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Error Handling Utility
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Authentication Helpers (Legacy Firebase Auth - kept for compatibility but bypassed)
export const loginWithGoogle = async () => {
  // Bypassed for simple auth
  throw new Error("Please use Email Login for now.");
};

// Custom Auth State Management
let customAuthUser: UserProfile | null = null;
const AUTH_STORAGE_KEY = 'eduflow_auth_user_id';

export const getStoredUserId = () => localStorage.getItem(AUTH_STORAGE_KEY);

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw { code: 'auth/user-not-found' };
    }
    
    // In a real app, we'd check passwords. For this "no need of fire auth" request, 
    // we'll just log them in if the email exists.
    const userData = snapshot.docs[0].data() as UserProfile;
    localStorage.setItem(AUTH_STORAGE_KEY, userData.uid);
    return userData;
  } catch (error) {
    console.error('Email Login Error:', error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string, initialData: Partial<UserProfile> = {}) => {
  try {
    // Check if user exists
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw { code: 'auth/email-already-in-use' };
    }

    const uid = `user_${Date.now()}`;
    const newUser: UserProfile = {
      uid,
      email,
      name: email.split('@')[0],
      role: email === 'dattabarsha9@gmail.com' ? 'admin' : (initialData.role || 'student'),
      createdAt: new Date().toISOString(),
      ...initialData
    };

    await setDoc(doc(db, 'users', uid), newUser);
    localStorage.setItem(AUTH_STORAGE_KEY, uid);
    return newUser;
  } catch (error) {
    console.error('Registration Error:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.location.href = '/login';
};

// Notification Helper
export const sendNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...notification,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Types
export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  createdAt: string;
  phone?: string;
  bio?: string;
  class?: string;
  photoURL?: string;
  // Teacher specific
  department?: string;
  subjects?: string[];
  // Student specific
  section?: string;
  academyName?: string;
  rollNo?: string;
}

export interface StudentProfile {
  uid: string;
  grade: string;
  section: string;
  parentName?: string;
  parentContact?: string;
  address?: string;
}

export interface TeacherProfile {
  uid: string;
  subjects: string[];
  department: string;
  joiningDate: string;
}

export interface ClassData {
  id: string;
  name: string;
  section: string;
  teacherId: string;
  studentIds: string[];
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  date: string;
  records: Record<string, 'present' | 'absent'>;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  classId: string;
  examName: string;
  score: number;
  totalScore: number;
  date: string;
}

export interface ExamQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  classId: string;
  teacherId: string;
  questions: ExamQuestion[];
  createdAt: string;
  scheduledDate?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface ScheduleEntry {
  id: string;
  studentId: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  time: string;
  title: string;
  type: 'class' | 'exam' | 'study' | 'other';
  location?: string;
  teacherName?: string;
  description?: string;
}
