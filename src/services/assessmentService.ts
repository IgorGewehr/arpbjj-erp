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
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Assessment } from '@/types';

const COLLECTION = 'assessments';

// ============================================
// Helper: Convert Firestore document to Assessment
// ============================================
const docToAssessment = (doc: DocumentSnapshot): Assessment => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    studentId: data.studentId,
    studentName: data.studentName,
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    scores: {
      respeito: data.scores?.respeito || 0,
      disciplina: data.scores?.disciplina || 0,
      pontualidade: data.scores?.pontualidade || 0,
      tecnica: data.scores?.tecnica || 0,
      esforco: data.scores?.esforco || 0,
    },
    notes: data.notes,
    evaluatedBy: data.evaluatedBy,
    evaluatedByName: data.evaluatedByName,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  };
};

// ============================================
// Assessment Service
// ============================================
export const assessmentService = {
  // ============================================
  // Get Assessments by Student
  // ============================================
  async getByStudent(studentId: string, limitCount = 10): Promise<Assessment[]> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const assessments = snapshot.docs.map(docToAssessment);
    // Sort by date desc and limit client-side
    return assessments
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limitCount);
  },

  // ============================================
  // Get Latest Assessment for Student
  // ============================================
  async getLatest(studentId: string): Promise<Assessment | null> {
    const assessments = await this.getByStudent(studentId, 1);
    return assessments[0] || null;
  },

  // ============================================
  // Get Assessment by ID
  // ============================================
  async getById(id: string): Promise<Assessment | null> {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToAssessment(docSnap);
  },

  // ============================================
  // Create Assessment
  // ============================================
  async create(
    data: Omit<Assessment, 'id' | 'createdAt'>,
  ): Promise<Assessment> {
    const now = new Date();

    // Build docData carefully to avoid undefined values
    const docData: Record<string, unknown> = {
      studentId: data.studentId,
      studentName: data.studentName,
      date: Timestamp.fromDate(new Date(data.date)),
      scores: data.scores,
      evaluatedBy: data.evaluatedBy,
      evaluatedByName: data.evaluatedByName,
      createdAt: Timestamp.fromDate(now),
    };

    // Only add notes if it has a value
    if (data.notes) docData.notes = data.notes;

    const docRef = await addDoc(collection(db, COLLECTION), docData);

    // Return assessment directly without re-fetching
    const assessment: Assessment = {
      id: docRef.id,
      studentId: data.studentId,
      studentName: data.studentName,
      date: new Date(data.date),
      scores: data.scores,
      notes: data.notes,
      evaluatedBy: data.evaluatedBy,
      evaluatedByName: data.evaluatedByName,
      createdAt: now,
    };

    return assessment;
  },

  // ============================================
  // Update Assessment
  // ============================================
  async update(id: string, data: Partial<Assessment>): Promise<Assessment> {
    const docRef = doc(db, COLLECTION, id);

    const updateData: Record<string, unknown> = { ...data };

    if (data.date) {
      updateData.date = Timestamp.fromDate(new Date(data.date));
    }

    delete updateData.id;
    delete updateData.createdAt;

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return docToAssessment(updatedDoc);
  },

  // ============================================
  // Delete Assessment
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },

  // ============================================
  // Get Evolution Data (for radar chart)
  // ============================================
  async getEvolution(studentId: string, count = 5): Promise<{
    labels: string[];
    datasets: Array<{
      date: string;
      scores: Assessment['scores'];
    }>;
    averages: Assessment['scores'];
  }> {
    const assessments = await this.getByStudent(studentId, count);

    if (assessments.length === 0) {
      return {
        labels: ['Respeito', 'Disciplina', 'Pontualidade', 'Técnica', 'Esforço'],
        datasets: [],
        averages: {
          respeito: 0,
          disciplina: 0,
          pontualidade: 0,
          tecnica: 0,
          esforco: 0,
        },
      };
    }

    const totals = {
      respeito: 0,
      disciplina: 0,
      pontualidade: 0,
      tecnica: 0,
      esforco: 0,
    };

    const datasets = assessments.reverse().map((a) => {
      totals.respeito += a.scores.respeito;
      totals.disciplina += a.scores.disciplina;
      totals.pontualidade += a.scores.pontualidade;
      totals.tecnica += a.scores.tecnica;
      totals.esforco += a.scores.esforco;

      return {
        date: a.date.toISOString(),
        scores: a.scores,
      };
    });

    const count2 = assessments.length;
    const averages: Assessment['scores'] = {
      respeito: Math.round((totals.respeito / count2) * 10) / 10,
      disciplina: Math.round((totals.disciplina / count2) * 10) / 10,
      pontualidade: Math.round((totals.pontualidade / count2) * 10) / 10,
      tecnica: Math.round((totals.tecnica / count2) * 10) / 10,
      esforco: Math.round((totals.esforco / count2) * 10) / 10,
    };

    return {
      labels: ['Respeito', 'Disciplina', 'Pontualidade', 'Técnica', 'Esforço'],
      datasets,
      averages,
    };
  },

  // ============================================
  // Get Recent Assessments (all students)
  // ============================================
  async getRecent(limitCount = 20): Promise<Assessment[]> {
    // Fetch all and sort/limit client-side to avoid index issues
    const snapshot = await getDocs(collection(db, COLLECTION));
    const assessments = snapshot.docs.map(docToAssessment);
    // Sort by date desc and limit
    return assessments
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limitCount);
  },

  // ============================================
  // Calculate Overall Score
  // ============================================
  calculateOverallScore(scores: Assessment['scores']): number {
    const { respeito, disciplina, pontualidade, tecnica, esforco } = scores;
    const total = respeito + disciplina + pontualidade + tecnica + esforco;
    return Math.round((total / 5) * 10) / 10;
  },

  // ============================================
  // Get Performance Level
  // ============================================
  getPerformanceLevel(overallScore: number): {
    level: 'excelente' | 'muito_bom' | 'bom' | 'regular' | 'precisa_melhorar';
    label: string;
    color: string;
  } {
    if (overallScore >= 4.5) {
      return { level: 'excelente', label: 'Excelente', color: '#16A34A' };
    }
    if (overallScore >= 4) {
      return { level: 'muito_bom', label: 'Muito Bom', color: '#22C55E' };
    }
    if (overallScore >= 3) {
      return { level: 'bom', label: 'Bom', color: '#EAB308' };
    }
    if (overallScore >= 2) {
      return { level: 'regular', label: 'Regular', color: '#F97316' };
    }
    return { level: 'precisa_melhorar', label: 'Precisa Melhorar', color: '#EF4444' };
  },
};

export default assessmentService;
