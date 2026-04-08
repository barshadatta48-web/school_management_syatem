import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
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

// Authentication Helpers
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Login Error:', error);
    throw error;
  }
};

export const logout = () => signOut(auth);

// Types
export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  createdAt: string;
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
