import { api } from '@/lib/api/client';
import {
  Achievement,
  AchievementType,
  BeltColor,
  KidsBeltColor,
  Stripes,
  CompetitionPosition,
} from '@/types';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Helper: Get Belt Name in Portuguese
// ============================================
export const getBeltName = (belt: BeltColor | KidsBeltColor): string => {
  const names: Record<string, string> = {
    white: 'Branca',
    blue: 'Azul',
    purple: 'Roxa',
    brown: 'Marrom',
    black: 'Preta',
    grey: 'Cinza',
    'grey-white': 'Cinza/Branca',
    'grey-black': 'Cinza/Preta',
    yellow: 'Amarela',
    'yellow-white': 'Amarela/Branca',
    'yellow-black': 'Amarela/Preta',
    orange: 'Laranja',
    'orange-white': 'Laranja/Branca',
    'orange-black': 'Laranja/Preta',
    green: 'Verde',
    'green-white': 'Verde/Branca',
    'green-black': 'Verde/Preta',
  };
  return names[belt] || belt;
};

// ============================================
// Helper: Get Position Text in Portuguese
// ============================================
export const getPositionText = (position: CompetitionPosition): string => {
  const positions: Record<CompetitionPosition, string> = {
    gold: 'Ouro',
    silver: 'Prata',
    bronze: 'Bronze',
    participant: 'Participante',
  };
  return positions[position];
};

// ============================================
// Mapper
// ============================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapAchievement = (raw: any): Achievement => ({
  id: raw.id,
  studentId: raw.student_id,
  studentName: raw.student_name,
  type: raw.type as AchievementType,
  title: raw.title,
  description: raw.description,
  date: new Date(raw.date),
  fromBelt: raw.from_belt,
  toBelt: raw.to_belt,
  fromStripes: raw.from_stripes,
  toStripes: raw.to_stripes,
  competitionId: raw.competition_id,
  competitionName: raw.competition_name,
  position: raw.position,
  milestone: raw.milestone,
  photoUrl: raw.photo_url,
  isPublic: raw.is_public ?? true,
  createdAt: new Date(raw.created_at),
  createdBy: raw.created_by,
});

// ============================================
// Achievement Service (Multi-Tenant)
// ============================================
export class AchievementService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private achievementsBase(studentId: string) {
    return `/v1/academies/${this.academyId}/students/${studentId}/achievements`;
  }

  async getByStudent(studentId: string): Promise<Achievement[]> {
    const res = await api.get<{ items: unknown[] } | unknown[]>(this.achievementsBase(studentId));
    const raw = Array.isArray(res) ? res : (res as { items: unknown[] }).items ?? [];
    const achievements = raw.map(mapAchievement);
    return achievements.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getForStudent(studentId: string): Promise<Achievement[]> {
    return this.getByStudent(studentId);
  }

  async getById(id: string, studentId: string): Promise<Achievement | null> {
    try {
      const raw = await api.get<unknown>(`${this.achievementsBase(studentId)}/${id}`);
      return mapAchievement(raw);
    } catch {
      return null;
    }
  }

  async getByType(studentId: string, type: AchievementType): Promise<Achievement[]> {
    const all = await this.getByStudent(studentId);
    return all.filter((a) => a.type === type).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getPublic(studentId: string): Promise<Achievement[]> {
    const all = await this.getByStudent(studentId);
    return all.filter((a) => a.isPublic).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getRecent(limitCount = 10): Promise<Achievement[]> {
    // Without a global endpoint, we can't efficiently do this cross-student.
    // Return empty — callers should use getByStudent with a specific studentId.
    return [];
  }

  async getCompetitions(studentId: string): Promise<Achievement[]> {
    return this.getByType(studentId, 'competition');
  }

  async getGraduations(studentId: string): Promise<Achievement[]> {
    const graduations = await this.getByType(studentId, 'graduation');
    const stripes = await this.getByType(studentId, 'stripe');
    return [...graduations, ...stripes].sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getMilestones(studentId: string): Promise<Achievement[]> {
    return this.getByType(studentId, 'milestone');
  }

  async create(
    data: Omit<Achievement, 'id' | 'createdAt'>,
    createdBy?: string
  ): Promise<Achievement> {
    const raw = await api.post<unknown>(this.achievementsBase(data.studentId), {
      student_name: data.studentName,
      type: data.type,
      title: data.title,
      description: data.description ?? null,
      date: new Date(data.date).toISOString(),
      from_belt: data.fromBelt ?? null,
      to_belt: data.toBelt ?? null,
      from_stripes: data.fromStripes ?? null,
      to_stripes: data.toStripes ?? null,
      competition_id: data.competitionId ?? null,
      competition_name: data.competitionName ?? null,
      position: data.position ?? null,
      milestone: data.milestone ?? null,
      photo_url: data.photoUrl ?? null,
      is_public: data.isPublic ?? true,
      created_by: createdBy ?? null,
    });
    return mapAchievement(raw);
  }

  async createGraduation(
    studentId: string,
    studentName: string,
    fromBelt: BeltColor | KidsBeltColor,
    toBelt: BeltColor | KidsBeltColor,
    fromStripes: Stripes,
    toStripes: Stripes,
    createdBy?: string,
    date?: Date
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
        date: date ?? new Date(),
        fromBelt,
        toBelt,
        fromStripes,
        toStripes,
        isPublic: true,
      },
      createdBy
    );
  }

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
    const title =
      position === 'participant'
        ? `Participou: ${competitionName}`
        : `${positionText} - ${competitionName}`;

    return this.create(
      {
        studentId,
        studentName,
        type: 'competition',
        title,
        description:
          position === 'participant'
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
  }

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
  }

  async createAttendanceMilestone(
    studentId: string,
    studentName: string,
    attendanceCount: number,
    milestoneDate?: Date,
    createdBy?: string
  ): Promise<Achievement | null> {
    const milestones = [50, 100, 200, 500, 1000];
    if (!milestones.includes(attendanceCount)) return null;

    const existing = await this.getForStudent(studentId);
    const alreadyExists = existing.some(
      (a) => a.type === 'milestone' && a.milestone === `${attendanceCount}_presencas`
    );
    if (alreadyExists) return null;

    return this.createMilestone(
      studentId,
      studentName,
      `${attendanceCount}_presencas`,
      `${attendanceCount} Presenças`,
      `Alcançou a marca de ${attendanceCount} presenças na academia!`,
      milestoneDate,
      createdBy
    );
  }

  async createAnniversaryMilestone(
    studentId: string,
    studentName: string,
    years: number,
    anniversaryDate: Date,
    createdBy?: string
  ): Promise<Achievement | null> {
    const validYears = [1, 2, 3, 5, 10];
    if (!validYears.includes(years)) return null;

    const existing = await this.getForStudent(studentId);
    const alreadyExists = existing.some(
      (a) => a.type === 'milestone' && a.milestone === `${years}_anos_treino`
    );
    if (alreadyExists) return null;

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
  }

  async update(id: string, studentId: string, data: Partial<Achievement>): Promise<Achievement> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.description !== undefined) body.description = data.description;
    if (data.isPublic !== undefined) body.is_public = data.isPublic;
    if (data.photoUrl !== undefined) body.photo_url = data.photoUrl;
    if (data.date) body.date = new Date(data.date).toISOString();

    const raw = await api.patch<unknown>(`${this.achievementsBase(studentId)}/${id}`, body);
    return mapAchievement(raw);
  }

  async delete(id: string, studentId: string): Promise<void> {
    await api.delete(`${this.achievementsBase(studentId)}/${id}`);
  }

  async togglePublic(id: string, studentId: string): Promise<Achievement> {
    const achievement = await this.getById(id, studentId);
    if (!achievement) throw new Error('Achievement not found');
    return this.update(id, studentId, { isPublic: !achievement.isPublic });
  }

  async getMedalCount(studentId: string): Promise<{ gold: number; silver: number; bronze: number; total: number }> {
    const competitions = await this.getCompetitions(studentId);
    const counts = { gold: 0, silver: 0, bronze: 0, total: 0 };
    competitions.forEach((c) => {
      if (c.position === 'gold') counts.gold++;
      else if (c.position === 'silver') counts.silver++;
      else if (c.position === 'bronze') counts.bronze++;
    });
    counts.total = counts.gold + counts.silver + counts.bronze;
    return counts;
  }

  async getCountByType(studentId: string): Promise<Record<AchievementType, number>> {
    const achievements = await this.getForStudent(studentId);
    const count: Record<AchievementType, number> = {
      graduation: 0,
      stripe: 0,
      competition: 0,
      milestone: 0,
    };
    achievements.forEach((a) => { count[a.type]++; });
    return count;
  }

  async getTimeline(studentId: string): Promise<Achievement[]> {
    return this.getByStudent(studentId);
  }
}

// ============================================
// Factory Function
// ============================================
export function createAchievementService(academyId: string): AchievementService {
  return new AchievementService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
// Note: methods that required id-only now also need studentId.
// Legacy wrappers use DEFAULT_ACADEMY_ID and pass studentId where available.
// ============================================
export const achievementService = {
  getByStudent: (studentId: string) => new AchievementService(DEFAULT_ACADEMY_ID).getByStudent(studentId),
  getForStudent: (studentId: string) => new AchievementService(DEFAULT_ACADEMY_ID).getForStudent(studentId),
  getById: (id: string, studentId = '') => new AchievementService(DEFAULT_ACADEMY_ID).getById(id, studentId),
  getByType: (studentId: string, type: AchievementType) => new AchievementService(DEFAULT_ACADEMY_ID).getByType(studentId, type),
  getPublic: (studentId: string) => new AchievementService(DEFAULT_ACADEMY_ID).getPublic(studentId),
  getRecent: (limitCount = 10) => new AchievementService(DEFAULT_ACADEMY_ID).getRecent(limitCount),
  getCompetitions: (studentId: string) => new AchievementService(DEFAULT_ACADEMY_ID).getCompetitions(studentId),
  getGraduations: (studentId: string) => new AchievementService(DEFAULT_ACADEMY_ID).getGraduations(studentId),
  getMilestones: (studentId: string) => new AchievementService(DEFAULT_ACADEMY_ID).getMilestones(studentId),
  create: (data: Omit<Achievement, 'id' | 'createdAt'>, createdBy?: string) =>
    new AchievementService(DEFAULT_ACADEMY_ID).create(data, createdBy),
  createGraduation: (
    studentId: string,
    studentName: string,
    fromBelt: BeltColor | KidsBeltColor,
    toBelt: BeltColor | KidsBeltColor,
    fromStripes: Stripes,
    toStripes: Stripes,
    createdBy?: string,
    date?: Date
  ) => new AchievementService(DEFAULT_ACADEMY_ID).createGraduation(studentId, studentName, fromBelt, toBelt, fromStripes, toStripes, createdBy, date),
  createCompetitionAchievement: (
    studentId: string,
    studentName: string,
    competitionId: string,
    competitionName: string,
    position: CompetitionPosition,
    date: Date,
    createdBy?: string
  ) => new AchievementService(DEFAULT_ACADEMY_ID).createCompetitionAchievement(studentId, studentName, competitionId, competitionName, position, date, createdBy),
  createMilestone: (
    studentId: string,
    studentName: string,
    milestone: string,
    title: string,
    description?: string,
    date?: Date,
    createdBy?: string
  ) => new AchievementService(DEFAULT_ACADEMY_ID).createMilestone(studentId, studentName, milestone, title, description, date, createdBy),
  createAttendanceMilestone: (studentId: string, studentName: string, attendanceCount: number, milestoneDate?: Date, createdBy?: string) =>
    new AchievementService(DEFAULT_ACADEMY_ID).createAttendanceMilestone(studentId, studentName, attendanceCount, milestoneDate, createdBy),
  createAnniversaryMilestone: (studentId: string, studentName: string, years: number, anniversaryDate: Date, createdBy?: string) =>
    new AchievementService(DEFAULT_ACADEMY_ID).createAnniversaryMilestone(studentId, studentName, years, anniversaryDate, createdBy),
  update: (id: string, data: Partial<Achievement>, studentId = '') =>
    new AchievementService(DEFAULT_ACADEMY_ID).update(id, studentId, data),
  delete: (id: string, studentId = '') =>
    new AchievementService(DEFAULT_ACADEMY_ID).delete(id, studentId),
  togglePublic: (id: string, studentId = '') =>
    new AchievementService(DEFAULT_ACADEMY_ID).togglePublic(id, studentId),
  getMedalCount: (studentId: string) => new AchievementService(DEFAULT_ACADEMY_ID).getMedalCount(studentId),
  getCountByType: (studentId: string) => new AchievementService(DEFAULT_ACADEMY_ID).getCountByType(studentId),
  getTimeline: (studentId: string) => new AchievementService(DEFAULT_ACADEMY_ID).getTimeline(studentId),
  // Helper exports
  getBeltName,
  getPositionText,
};

export default achievementService;
