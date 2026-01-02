import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Class, StudentCategory } from '@/types';

const COLLECTION = 'classes';

// ============================================
// Helper: Convert Firestore document to Class
// ============================================
const docToClass = (doc: DocumentSnapshot): Class => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    instructorId: data.instructorId,
    instructorName: data.instructorName,
    studentIds: data.studentIds || [],
    schedule: data.schedule || [],
    category: data.category,
    minBelt: data.minBelt,
    maxBelt: data.maxBelt,
    maxStudents: data.maxStudents,
    isActive: data.isActive ?? true,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
  };
};

// ============================================
// Class Service
// ============================================
export const classService = {
  // ============================================
  // List All Classes
  // ============================================
  async list(): Promise<Class[]> {
    const q = query(
      collection(db, COLLECTION),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    const classes = snapshot.docs.map(docToClass);
    // Sort client-side to avoid Firestore composite index requirement
    return classes.sort((a, b) => a.name.localeCompare(b.name));
  },

  // ============================================
  // Get Class by ID
  // ============================================
  async getById(id: string): Promise<Class | null> {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToClass(docSnap);
  },

  // ============================================
  // Get Classes by Day of Week
  // ============================================
  async getByDayOfWeek(dayOfWeek: number): Promise<Class[]> {
    const allClasses = await this.list();

    return allClasses.filter((cls) =>
      cls.schedule.some((s) => s.dayOfWeek === dayOfWeek)
    );
  },

  // ============================================
  // Get Current Class (based on day and time)
  // ============================================
  async getCurrentClass(): Promise<Class | null> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

    const classesForToday = await this.getByDayOfWeek(dayOfWeek);

    // Find class that is currently happening or about to start (within 30 min)
    for (const cls of classesForToday) {
      for (const schedule of cls.schedule) {
        if (schedule.dayOfWeek !== dayOfWeek) continue;

        const [startHour, startMin] = schedule.startTime.split(':').map(Number);
        const [endHour, endMin] = schedule.endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        // Check if within 30 min before start or during class
        if (currentTime >= startMinutes - 30 && currentTime <= endMinutes) {
          return cls;
        }
      }
    }

    return null;
  },

  // ============================================
  // Get Today's Classes
  // ============================================
  async getTodayClasses(): Promise<Class[]> {
    const dayOfWeek = new Date().getDay();
    return this.getByDayOfWeek(dayOfWeek);
  },

  // ============================================
  // Get Classes for a Specific Date
  // ============================================
  async getClassesForDate(date: Date): Promise<Class[]> {
    const dayOfWeek = date.getDay();
    return this.getByDayOfWeek(dayOfWeek);
  },

  // ============================================
  // Get Classes by Category
  // ============================================
  async getByCategory(category: StudentCategory): Promise<Class[]> {
    const q = query(
      collection(db, COLLECTION),
      where('category', '==', category),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    const classes = snapshot.docs.map(docToClass);
    // Sort client-side to avoid Firestore composite index requirement
    return classes.sort((a, b) => a.name.localeCompare(b.name));
  },

  // ============================================
  // Create Class
  // ============================================
  async create(classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>): Promise<Class> {
    const now = serverTimestamp();

    const docData = {
      ...classData,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTION), docData);
    const newDoc = await getDoc(docRef);

    return docToClass(newDoc);
  },

  // ============================================
  // Update Class
  // ============================================
  async update(id: string, data: Partial<Class>): Promise<Class> {
    const docRef = doc(db, COLLECTION, id);

    const { id: _, createdAt, ...updateData } = data as Class & { id?: string };

    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    const updatedDoc = await getDoc(docRef);
    return docToClass(updatedDoc);
  },

  // ============================================
  // Delete Class (Soft delete)
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  },

  // ============================================
  // Hard Delete Class
  // ============================================
  async hardDelete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },

  // ============================================
  // Get Weekly Schedule
  // ============================================
  async getWeeklySchedule(): Promise<Record<number, Class[]>> {
    const allClasses = await this.list();
    const schedule: Record<number, Class[]> = {
      0: [], // Sunday
      1: [], // Monday
      2: [], // Tuesday
      3: [], // Wednesday
      4: [], // Thursday
      5: [], // Friday
      6: [], // Saturday
    };

    for (const cls of allClasses) {
      for (const s of cls.schedule) {
        if (!schedule[s.dayOfWeek].find((c) => c.id === cls.id)) {
          schedule[s.dayOfWeek].push(cls);
        }
      }
    }

    // Sort each day by start time
    for (const day of Object.keys(schedule)) {
      schedule[Number(day)].sort((a, b) => {
        const aTime = a.schedule.find((s) => s.dayOfWeek === Number(day))?.startTime || '00:00';
        const bTime = b.schedule.find((s) => s.dayOfWeek === Number(day))?.startTime || '00:00';
        return aTime.localeCompare(bTime);
      });
    }

    return schedule;
  },

  // ============================================
  // Add Student to Class
  // ============================================
  async addStudent(classId: string, studentId: string): Promise<Class> {
    const cls = await this.getById(classId);
    if (!cls) throw new Error('Class not found');

    const studentIds = cls.studentIds || [];
    if (!studentIds.includes(studentId)) {
      studentIds.push(studentId);
      return this.update(classId, { studentIds });
    }

    return cls;
  },

  // ============================================
  // Remove Student from Class
  // ============================================
  async removeStudent(classId: string, studentId: string): Promise<Class> {
    const cls = await this.getById(classId);
    if (!cls) throw new Error('Class not found');

    const studentIds = (cls.studentIds || []).filter((id) => id !== studentId);
    return this.update(classId, { studentIds });
  },

  // ============================================
  // Toggle Student in Class
  // ============================================
  async toggleStudent(classId: string, studentId: string): Promise<Class> {
    const cls = await this.getById(classId);
    if (!cls) throw new Error('Class not found');

    const studentIds = cls.studentIds || [];
    if (studentIds.includes(studentId)) {
      return this.update(classId, { studentIds: studentIds.filter((id) => id !== studentId) });
    } else {
      return this.update(classId, { studentIds: [...studentIds, studentId] });
    }
  },
};

export default classService;
