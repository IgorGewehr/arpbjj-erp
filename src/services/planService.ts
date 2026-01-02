import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plan } from '@/types';

const COLLECTION = 'plans';

// ============================================
// Helper: Convert Firestore document to Plan
// ============================================
const docToPlan = (doc: DocumentSnapshot): Plan => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    monthlyValue: data.monthlyValue,
    classesPerWeek: data.classesPerWeek,
    studentIds: data.studentIds || [],
    isActive: data.isActive,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
  };
};

// ============================================
// Plan Service
// ============================================
export const planService = {
  // ============================================
  // Get All Plans
  // ============================================
  async list(): Promise<Plan[]> {
    // Fetch all and sort client-side to avoid index issues
    const snapshot = await getDocs(collection(db, COLLECTION));
    const plans = snapshot.docs.map(docToPlan);
    // Sort by monthlyValue asc
    return plans.sort((a, b) => a.monthlyValue - b.monthlyValue);
  },

  // ============================================
  // Get Active Plans
  // ============================================
  async getActive(): Promise<Plan[]> {
    const plans = await this.list();
    return plans.filter((p) => p.isActive);
  },

  // ============================================
  // Get Plan by ID
  // ============================================
  async getById(id: string): Promise<Plan | null> {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToPlan(docSnap);
  },

  // ============================================
  // Create Plan
  // ============================================
  async create(data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'studentIds'>): Promise<Plan> {
    const now = new Date();

    // Build docData carefully to avoid undefined values
    const docData: Record<string, unknown> = {
      name: data.name,
      monthlyValue: data.monthlyValue,
      classesPerWeek: data.classesPerWeek,
      isActive: data.isActive,
      studentIds: [],
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    // Only add description if it has a value
    if (data.description) docData.description = data.description;

    const docRef = await addDoc(collection(db, COLLECTION), docData);

    // Return plan directly without re-fetching
    const plan: Plan = {
      id: docRef.id,
      name: data.name,
      description: data.description,
      monthlyValue: data.monthlyValue,
      classesPerWeek: data.classesPerWeek,
      studentIds: [],
      isActive: data.isActive,
      createdAt: now,
      updatedAt: now,
    };

    return plan;
  },

  // ============================================
  // Update Plan
  // ============================================
  async update(id: string, data: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Plan> {
    const docRef = doc(db, COLLECTION, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Only add fields that are being updated
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.monthlyValue !== undefined) updateData.monthlyValue = data.monthlyValue;
    if (data.classesPerWeek !== undefined) updateData.classesPerWeek = data.classesPerWeek;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.studentIds !== undefined) updateData.studentIds = data.studentIds;

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return docToPlan(updatedDoc);
  },

  // ============================================
  // Delete Plan
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },

  // ============================================
  // Add Student to Plan
  // ============================================
  async addStudent(planId: string, studentId: string): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    if (plan.studentIds.includes(studentId)) {
      return plan; // Already enrolled
    }

    return this.update(planId, {
      studentIds: [...plan.studentIds, studentId],
    });
  },

  // ============================================
  // Remove Student from Plan
  // ============================================
  async removeStudent(planId: string, studentId: string): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    return this.update(planId, {
      studentIds: plan.studentIds.filter((id) => id !== studentId),
    });
  },

  // ============================================
  // Toggle Student in Plan
  // ============================================
  async toggleStudent(planId: string, studentId: string): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const isEnrolled = plan.studentIds.includes(studentId);

    // If student is in another plan, remove from there first
    if (!isEnrolled) {
      // Remove from all other plans first
      const allPlans = await this.list();
      for (const otherPlan of allPlans) {
        if (otherPlan.id !== planId && otherPlan.studentIds.includes(studentId)) {
          await this.removeStudent(otherPlan.id, studentId);
        }
      }
    }

    return this.update(planId, {
      studentIds: isEnrolled
        ? plan.studentIds.filter((id) => id !== studentId)
        : [...plan.studentIds, studentId],
    });
  },

  // ============================================
  // Get Students by Plan
  // ============================================
  async getStudentsByPlan(planId: string): Promise<string[]> {
    const plan = await this.getById(planId);
    return plan?.studentIds || [];
  },

  // ============================================
  // Get Plan for Student
  // ============================================
  async getPlanForStudent(studentId: string): Promise<Plan | null> {
    const plans = await this.list();
    return plans.find((p) => p.studentIds.includes(studentId)) || null;
  },
};

export default planService;
