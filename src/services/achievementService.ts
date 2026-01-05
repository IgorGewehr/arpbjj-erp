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
import {
  Achievement,
  AchievementType,
  BeltColor,
  KidsBeltColor,
  Stripes,
  CompetitionPosition,
} from '@/types';

const COLLECTION = 'achievements';

// ============================================
// Helper: Convert Firestore document to Achievement
// ============================================
const docToAchievement = (doc: DocumentSnapshot): Achievement => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    studentId: data.studentId,
    studentName: data.studentName,
    type: data.type,
    title: data.title,
    description: data.description,
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    fromBelt: data.fromBelt,
    toBelt: data.toBelt,
    fromStripes: data.fromStripes,
    toStripes: data.toStripes,
    competitionId: data.competitionId,
    competitionName: data.competitionName,
    position: data.position,
    milestone: data.milestone,
    photoUrl: data.photoUrl,
    isPublic: data.isPublic ?? true,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    createdBy: data.createdBy,
  };
};

// ============================================
// Helper: Get Belt Name in Portuguese
// ============================================
const getBeltName = (belt: BeltColor | KidsBeltColor): string => {
  const names: Record<string, string> = {
    white: 'Branca',
    blue: 'Azul',
    purple: 'Roxa',
    brown: 'Marrom',
    black: 'Preta',
    grey: 'Cinza',
    yellow: 'Amarela',
    orange: 'Laranja',
    green: 'Verde',
  };
  return names[belt] || belt;
};

// ============================================
// Helper: Get Position Text in Portuguese
// ============================================
const getPositionText = (position: CompetitionPosition): string => {
  const positions: Record<CompetitionPosition, string> = {
    gold: 'Ouro',
    silver: 'Prata',
    bronze: 'Bronze',
    participant: 'Participante',
  };
  return positions[position];
};

// ============================================
// Achievement Service
// ============================================
export const achievementService = {
  // ============================================
  // Get Achievements by Student
  // ============================================
  async getByStudent(studentId: string): Promise<Achievement[]> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const achievements = snapshot.docs.map(docToAchievement);
    // Sort client-side to avoid composite index
    return achievements.sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // Alias for getByStudent
  async getForStudent(studentId: string): Promise<Achievement[]> {
    return this.getByStudent(studentId);
  },

  // ============================================
  // Get Achievement by ID
  // ============================================
  async getById(id: string): Promise<Achievement | null> {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToAchievement(docSnap);
  },

  // ============================================
  // Get Achievements by Type
  // ============================================
  async getByType(studentId: string, type: AchievementType): Promise<Achievement[]> {
    // Query by studentId only and filter by type client-side to avoid composite index
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const achievements = snapshot.docs.map(docToAchievement);
    // Filter by type and sort client-side
    return achievements
      .filter((a) => a.type === type)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // ============================================
  // Get Public Achievements (for sharing)
  // ============================================
  async getPublic(studentId: string): Promise<Achievement[]> {
    // Query by studentId only and filter by isPublic client-side to avoid composite index
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const achievements = snapshot.docs.map(docToAchievement);
    // Filter by isPublic and sort client-side
    return achievements
      .filter((a) => a.isPublic)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // ============================================
  // Get Recent Achievements
  // ============================================
  async getRecent(limitCount = 10): Promise<Achievement[]> {
    // Fetch all and sort/limit client-side to avoid index issues
    const snapshot = await getDocs(collection(db, COLLECTION));
    const achievements = snapshot.docs.map(docToAchievement);
    // Sort by date desc and limit
    return achievements
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limitCount);
  },

  // ============================================
  // Get Competitions by Student
  // ============================================
  async getCompetitions(studentId: string): Promise<Achievement[]> {
    return this.getByType(studentId, 'competition');
  },

  // ============================================
  // Get Graduations by Student
  // ============================================
  async getGraduations(studentId: string): Promise<Achievement[]> {
    const graduations = await this.getByType(studentId, 'graduation');
    const stripes = await this.getByType(studentId, 'stripe');
    return [...graduations, ...stripes].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  },

  // ============================================
  // Get Milestones by Student
  // ============================================
  async getMilestones(studentId: string): Promise<Achievement[]> {
    return this.getByType(studentId, 'milestone');
  },

  // ============================================
  // Create Achievement (generic)
  // ============================================
  async create(
    data: Omit<Achievement, 'id' | 'createdAt'>,
    createdBy?: string
  ): Promise<Achievement> {
    const now = new Date();

    // Build docData carefully to avoid undefined values
    const docData: Record<string, unknown> = {
      studentId: data.studentId,
      studentName: data.studentName,
      type: data.type,
      title: data.title,
      date: Timestamp.fromDate(new Date(data.date)),
      isPublic: data.isPublic ?? true,
      createdAt: Timestamp.fromDate(now),
    };

    // Only add optional fields if they have values
    if (data.description) docData.description = data.description;
    if (createdBy) docData.createdBy = createdBy;
    if (data.fromBelt) docData.fromBelt = data.fromBelt;
    if (data.toBelt) docData.toBelt = data.toBelt;
    if (data.fromStripes !== undefined) docData.fromStripes = data.fromStripes;
    if (data.toStripes !== undefined) docData.toStripes = data.toStripes;
    if (data.competitionId) docData.competitionId = data.competitionId;
    if (data.competitionName) docData.competitionName = data.competitionName;
    if (data.position) docData.position = data.position;
    if (data.milestone) docData.milestone = data.milestone;
    if (data.photoUrl) docData.photoUrl = data.photoUrl;

    const docRef = await addDoc(collection(db, COLLECTION), docData);

    // Return the achievement object directly without re-fetching
    const achievement: Achievement = {
      id: docRef.id,
      studentId: data.studentId,
      studentName: data.studentName,
      type: data.type,
      title: data.title,
      description: data.description,
      date: new Date(data.date),
      fromBelt: data.fromBelt,
      toBelt: data.toBelt,
      fromStripes: data.fromStripes,
      toStripes: data.toStripes,
      competitionId: data.competitionId,
      competitionName: data.competitionName,
      position: data.position,
      milestone: data.milestone,
      photoUrl: data.photoUrl,
      isPublic: data.isPublic ?? true,
      createdAt: now,
      createdBy,
    };

    return achievement;
  },

  // ============================================
  // Create Graduation Achievement
  // ============================================
  async createGraduation(
    studentId: string,
    studentName: string,
    fromBelt: BeltColor | KidsBeltColor,
    toBelt: BeltColor | KidsBeltColor,
    fromStripes: Stripes,
    toStripes: Stripes,
    createdBy?: string
  ): Promise<Achievement> {
    const isStripesOnly = fromBelt === toBelt;
    const title = isStripesOnly
      ? `${toStripes}º Grau - Faixa ${getBeltName(toBelt)}`
      : `Graduação para Faixa ${getBeltName(toBelt)}`;

    return this.create(
      {
        studentId,
        studentName,
        type: isStripesOnly ? 'stripe' : 'graduation',
        title,
        description: isStripesOnly
          ? `Recebeu o ${toStripes}º grau na faixa ${getBeltName(toBelt)}`
          : `Graduou de ${getBeltName(fromBelt)} para ${getBeltName(toBelt)}`,
        date: new Date(),
        fromBelt,
        toBelt,
        fromStripes,
        toStripes,
        isPublic: true,
      },
      createdBy
    );
  },

  // ============================================
  // Create Competition Achievement
  // ============================================
  async createCompetitionAchievement(
    studentId: string,
    studentName: string,
    competitionId: string,
    competitionName: string,
    position: CompetitionPosition,
    date: Date,
    createdBy?: string
  ): Promise<Achievement> {
    const positionText = getPositionText(position);
    const title = position === 'participant'
      ? `Participou: ${competitionName}`
      : `${positionText} - ${competitionName}`;

    return this.create(
      {
        studentId,
        studentName,
        type: 'competition',
        title,
        description: position === 'participant'
          ? `Participou da competição ${competitionName}`
          : `Conquistou ${positionText} na competição ${competitionName}`,
        date,
        competitionId,
        competitionName,
        position,
        isPublic: true,
      },
      createdBy
    );
  },

  // ============================================
  // Create Milestone Achievement
  // ============================================
  async createMilestone(
    studentId: string,
    studentName: string,
    milestone: string,
    title: string,
    description?: string,
    date?: Date,
    createdBy?: string
  ): Promise<Achievement> {
    return this.create(
      {
        studentId,
        studentName,
        type: 'milestone',
        title,
        description,
        date: date ?? new Date(),
        milestone,
        isPublic: true,
      },
      createdBy
    );
  },

  // ============================================
  // Create Attendance Milestone
  // ============================================
  async createAttendanceMilestone(
    studentId: string,
    studentName: string,
    attendanceCount: number,
    createdBy?: string
  ): Promise<Achievement | null> {
    const milestones = [50, 100, 200, 500, 1000];
    if (!milestones.includes(attendanceCount)) {
      return null;
    }

    // Check if this milestone already exists
    const existing = await this.getForStudent(studentId);
    const alreadyExists = existing.some(
      (a) => a.type === 'milestone' && a.milestone === `${attendanceCount}_presencas`
    );

    if (alreadyExists) {
      return null;
    }

    return this.createMilestone(
      studentId,
      studentName,
      `${attendanceCount}_presencas`,
      `${attendanceCount} Presenças`,
      `Alcançou a marca de ${attendanceCount} presenças na academia!`,
      undefined, // Use current date for attendance milestones
      createdBy
    );
  },

  // ============================================
  // Create Training Anniversary Milestone
  // ============================================
  async createAnniversaryMilestone(
    studentId: string,
    studentName: string,
    years: number,
    anniversaryDate: Date,
    createdBy?: string
  ): Promise<Achievement | null> {
    const validYears = [1, 2, 3, 5, 10];
    if (!validYears.includes(years)) {
      return null;
    }

    // Check if this milestone already exists
    const existing = await this.getForStudent(studentId);
    const alreadyExists = existing.some(
      (a) => a.type === 'milestone' && a.milestone === `${years}_anos_treino`
    );

    if (alreadyExists) {
      return null;
    }

    const yearText = years === 1 ? 'ano' : 'anos';

    return this.createMilestone(
      studentId,
      studentName,
      `${years}_anos_treino`,
      `${years} ${yearText.charAt(0).toUpperCase() + yearText.slice(1)} de Treino`,
      `Completou ${years} ${yearText} treinando na academia!`,
      anniversaryDate,
      createdBy
    );
  },

  // ============================================
  // Update Achievement
  // ============================================
  async update(id: string, data: Partial<Achievement>): Promise<Achievement> {
    const docRef = doc(db, COLLECTION, id);

    const updateData: Record<string, unknown> = { ...data };

    if (data.date) {
      updateData.date = Timestamp.fromDate(new Date(data.date));
    }

    delete updateData.id;
    delete updateData.createdAt;

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return docToAchievement(updatedDoc);
  },

  // ============================================
  // Delete Achievement
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },

  // ============================================
  // Toggle Public Visibility
  // ============================================
  async togglePublic(id: string): Promise<Achievement> {
    const achievement = await this.getById(id);
    if (!achievement) {
      throw new Error('Achievement not found');
    }

    return this.update(id, { isPublic: !achievement.isPublic });
  },

  // ============================================
  // Get Medal Count by Student
  // ============================================
  async getMedalCount(studentId: string): Promise<{
    gold: number;
    silver: number;
    bronze: number;
    total: number;
  }> {
    const competitions = await this.getCompetitions(studentId);

    const counts = {
      gold: 0,
      silver: 0,
      bronze: 0,
      total: 0,
    };

    competitions.forEach((c) => {
      if (c.position === 'gold') counts.gold++;
      else if (c.position === 'silver') counts.silver++;
      else if (c.position === 'bronze') counts.bronze++;
    });

    counts.total = counts.gold + counts.silver + counts.bronze;
    return counts;
  },

  // ============================================
  // Get Achievements Count by Type
  // ============================================
  async getCountByType(studentId: string): Promise<Record<AchievementType, number>> {
    const achievements = await this.getForStudent(studentId);

    const count: Record<AchievementType, number> = {
      graduation: 0,
      stripe: 0,
      competition: 0,
      milestone: 0,
    };

    achievements.forEach((a) => {
      count[a.type]++;
    });

    return count;
  },

  // ============================================
  // Get Timeline (all achievements sorted by date)
  // ============================================
  async getTimeline(studentId: string): Promise<Achievement[]> {
    return this.getByStudent(studentId);
  },

  // ============================================
  // Helper exports
  // ============================================
  getBeltName,
  getPositionText,
};

export default achievementService;
