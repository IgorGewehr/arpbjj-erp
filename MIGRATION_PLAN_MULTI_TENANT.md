# Plano de Migração Multi-Tenant - MarcusJJ

## Sumário Executivo

Este documento detalha duas estratégias de migração para arquitetura multi-tenant:

| Estratégia | Prós | Contras | Tempo Estimado |
|------------|------|---------|----------------|
| **A: Migração In-Place** | Mantém histórico, menos trabalho inicial | Risco de impacto no user atual | Médio |
| **B: Banco Novo (Clean Start)** | Zero risco, arquitetura limpa | Precisa migrar dados manualmente | Alto inicial, baixo longo prazo |

**Recomendação:** Estratégia B (Banco Novo) - mais seguro e profissional.

---

## Arquitetura Atual vs. Nova

### Estrutura Atual (Single-Tenant)
```
firestore/
├── users/{userId}
├── students/{studentId}
├── classes/{classId}
├── attendance/{attendanceId}
├── financials/{financialId}
├── achievements/{achievementId}
├── beltProgressions/{progressionId}
├── competitions/{competitionId}
├── competitionResults/{resultId}
├── competitionEnrollments/{enrollmentId}
├── plans/{planId}
├── linkCodes/{codeId}
├── assessments/{assessmentId}
└── settings/academy
```

### Nova Estrutura (Multi-Tenant)
```
firestore/
├── academies/{academyId}
│   ├── name: string
│   ├── slug: string (URL-friendly: "tropa23")
│   ├── logo: string
│   ├── settings: { pix, address, cnpj, ... }
│   ├── createdAt: timestamp
│   ├── subscription: { plan, status, expiresAt }
│   │
│   ├── users/{odqmW...} (Firebase UID como ID)
│   │   ├── email, displayName, photoUrl
│   │   ├── role: 'admin' | 'instructor' | 'student' | 'guardian'
│   │   ├── studentId?: string
│   │   └── linkedStudentIds?: string[]
│   │
│   ├── students/{studentId}
│   │   └── (mesmo schema atual)
│   │
│   ├── classes/{classId}
│   ├── attendance/{attendanceId}
│   ├── financials/{financialId}
│   ├── achievements/{achievementId}
│   ├── beltProgressions/{progressionId}
│   ├── competitions/{competitionId}
│   ├── competitionResults/{resultId}
│   ├── competitionEnrollments/{enrollmentId}
│   ├── plans/{planId}
│   ├── linkCodes/{codeId}
│   └── assessments/{assessmentId}
│
└── userAcademyMapping/{odqmW...} (Firebase UID)
    └── academyIds: string[] (para users em múltiplas academias)
```

---

## Coleções a Migrar

| # | Coleção | Docs Estimados | Dependências |
|---|---------|----------------|--------------|
| 1 | `settings` | 1 | Nenhuma |
| 2 | `users` | ~10-50 | Nenhuma |
| 3 | `plans` | ~5-10 | Nenhuma |
| 4 | `students` | ~100-500 | plans |
| 5 | `classes` | ~10-20 | students (IDs) |
| 6 | `attendance` | ~1000+ | students, classes |
| 7 | `financials` | ~500+ | students |
| 8 | `achievements` | ~200+ | students |
| 9 | `beltProgressions` | ~100+ | students |
| 10 | `competitions` | ~10-50 | students (IDs) |
| 11 | `competitionResults` | ~50+ | competitions, students |
| 12 | `competitionEnrollments` | ~100+ | competitions, students |
| 13 | `assessments` | ~100+ | students |
| 14 | `linkCodes` | ~50+ | students |

---

## Estratégia A: Migração In-Place

### Fase 1: Preparação (sem deploy)

#### 1.1 Criar AcademyContext

```typescript
// src/contexts/AcademyContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface AcademyContextType {
  academyId: string | null;
  academyData: AcademyData | null;
  isLoading: boolean;
  setAcademy: (id: string) => void;
}

interface AcademyData {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  settings: AcademySettings;
}

const AcademyContext = createContext<AcademyContextType | null>(null);

export function AcademyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [academyData, setAcademyData] = useState<AcademyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUserAcademy() {
      if (!user) {
        setAcademyId(null);
        setAcademyData(null);
        setIsLoading(false);
        return;
      }

      // Buscar mapping do user
      const mappingDoc = await getDoc(doc(db, 'userAcademyMapping', user.id));

      if (mappingDoc.exists()) {
        const academyIds = mappingDoc.data().academyIds;
        // Por enquanto, pegar a primeira academia
        const primaryAcademyId = academyIds[0];
        setAcademyId(primaryAcademyId);

        // Carregar dados da academia
        const academyDoc = await getDoc(doc(db, 'academies', primaryAcademyId));
        if (academyDoc.exists()) {
          setAcademyData({ id: academyDoc.id, ...academyDoc.data() } as AcademyData);
        }
      }

      setIsLoading(false);
    }

    loadUserAcademy();
  }, [user]);

  return (
    <AcademyContext.Provider value={{
      academyId,
      academyData,
      isLoading,
      setAcademy: setAcademyId
    }}>
      {children}
    </AcademyContext.Provider>
  );
}

export function useAcademy() {
  const context = useContext(AcademyContext);
  if (!context) {
    throw new Error('useAcademy must be used within AcademyProvider');
  }
  return context;
}
```

#### 1.2 Criar Helper para Collection Paths

```typescript
// src/lib/firebase/collections.ts
import { collection, doc, CollectionReference, DocumentReference } from 'firebase/firestore';
import { db } from './config';

export function getCollectionPath(academyId: string, collectionName: string): string {
  return `academies/${academyId}/${collectionName}`;
}

export function getCollection(academyId: string, collectionName: string): CollectionReference {
  return collection(db, getCollectionPath(academyId, collectionName));
}

export function getDocRef(academyId: string, collectionName: string, docId: string): DocumentReference {
  return doc(db, getCollectionPath(academyId, collectionName), docId);
}

// Collections helpers específicos
export const collections = {
  students: (academyId: string) => getCollection(academyId, 'students'),
  classes: (academyId: string) => getCollection(academyId, 'classes'),
  attendance: (academyId: string) => getCollection(academyId, 'attendance'),
  financials: (academyId: string) => getCollection(academyId, 'financials'),
  achievements: (academyId: string) => getCollection(academyId, 'achievements'),
  beltProgressions: (academyId: string) => getCollection(academyId, 'beltProgressions'),
  competitions: (academyId: string) => getCollection(academyId, 'competitions'),
  competitionResults: (academyId: string) => getCollection(academyId, 'competitionResults'),
  competitionEnrollments: (academyId: string) => getCollection(academyId, 'competitionEnrollments'),
  plans: (academyId: string) => getCollection(academyId, 'plans'),
  linkCodes: (academyId: string) => getCollection(academyId, 'linkCodes'),
  assessments: (academyId: string) => getCollection(academyId, 'assessments'),
  users: (academyId: string) => getCollection(academyId, 'users'),
};
```

---

### Fase 2: Modificação dos Services

Cada service precisa ser modificado para receber `academyId` como parâmetro ou usar o contexto.

#### Padrão de Modificação (2 opções):

**Opção A: Parâmetro em cada função**
```typescript
// Antes
async function getById(id: string): Promise<Student | null>

// Depois
async function getById(academyId: string, id: string): Promise<Student | null>
```

**Opção B: Factory Pattern (Recomendado)**
```typescript
// Antes
class StudentService {
  private studentsRef = collection(db, 'students');

  async getById(id: string) {
    const docRef = doc(this.studentsRef, id);
    // ...
  }
}

export const studentService = new StudentService();

// Depois
class StudentService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get studentsRef() {
    return collection(db, `academies/${this.academyId}/students`);
  }

  async getById(id: string) {
    const docRef = doc(this.studentsRef, id);
    // ...
  }
}

// Factory function
export function createStudentService(academyId: string) {
  return new StudentService(academyId);
}

// Hook para uso em componentes
export function useStudentService() {
  const { academyId } = useAcademy();
  if (!academyId) throw new Error('No academy selected');
  return useMemo(() => createStudentService(academyId), [academyId]);
}
```

---

## Lista Completa de Funções a Modificar

### 1. studentService.ts (19 funções)

| Função | Linha | Modificação |
|--------|-------|-------------|
| `listAll(filters?, pageSize?, lastStudentId?)` | - | Mudar `collection(db, 'students')` → `this.studentsRef` |
| `searchByName(searchTerm, filters?)` | - | Mudar collection ref |
| `list(filters?, page?, perPage?, lastDoc?)` | - | Mudar collection ref |
| `getById(id)` | - | Mudar collection ref |
| `getByStatus(status)` | - | Mudar collection ref |
| `getActive()` | - | Mudar collection ref |
| `getAll()` | - | Mudar collection ref |
| `search(searchTerm)` | - | Mudar collection ref |
| `create(student, createdBy?)` | - | Mudar collection ref |
| `update(id, data)` | - | Mudar collection ref |
| `delete(id)` | - | Mudar collection ref |
| `hardDelete(id)` | - | Mudar collection ref |
| `quickCreate(fullName, phone, createdBy)` | - | Mudar collection ref |
| `getByBelt(belt)` | - | Mudar collection ref |
| `getByCategory(category)` | - | Mudar collection ref |
| `getCountByStatus()` | - | Mudar collection ref |
| `getDashboardStats()` | - | Mudar collection ref |
| `updateBelt(id, newBelt, newStripes)` | - | Mudar collection ref |
| `syncAttendanceCounts()` | - | Mudar collection ref + attendance ref |

**Exemplo de modificação completa:**

```typescript
// src/services/studentService.ts - NOVO

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, increment,
  DocumentSnapshot, QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Student, StudentFilters, PaginatedResponse } from '@/types';

class StudentService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get studentsRef() {
    return collection(db, `academies/${this.academyId}/students`);
  }

  private get attendanceRef() {
    return collection(db, `academies/${this.academyId}/attendance`);
  }

  async listAll(
    filters?: StudentFilters,
    pageSize: number = 50,
    lastStudentId?: string
  ): Promise<PaginatedResponse<Student>> {
    const constraints: QueryConstraint[] = [];

    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters?.belt) {
      constraints.push(where('currentBelt', '==', filters.belt));
    }

    constraints.push(orderBy('fullName'));
    constraints.push(limit(pageSize + 1));

    if (lastStudentId) {
      const lastDoc = await getDoc(doc(this.studentsRef, lastStudentId));
      if (lastDoc.exists()) {
        constraints.push(startAfter(lastDoc));
      }
    }

    const q = query(this.studentsRef, ...constraints);
    const snapshot = await getDocs(q);

    const students = snapshot.docs.slice(0, pageSize).map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Student[];

    return {
      data: students,
      hasMore: snapshot.docs.length > pageSize,
      lastId: students[students.length - 1]?.id
    };
  }

  async getById(id: string): Promise<Student | null> {
    const docRef = doc(this.studentsRef, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return { id: docSnap.id, ...docSnap.data() } as Student;
  }

  async create(
    student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy?: string
  ): Promise<Student> {
    const now = new Date();
    const docRef = await addDoc(this.studentsRef, {
      ...student,
      createdAt: now,
      updatedAt: now,
      createdBy: createdBy || null,
      attendanceCount: 0,
      status: student.status || 'active'
    });

    return { id: docRef.id, ...student, createdAt: now, updatedAt: now } as Student;
  }

  async update(id: string, data: Partial<Student>): Promise<Student> {
    const docRef = doc(this.studentsRef, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });

    const updated = await this.getById(id);
    if (!updated) throw new Error('Student not found after update');
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Soft delete
    await this.update(id, { status: 'inactive' });
  }

  async hardDelete(id: string): Promise<void> {
    const docRef = doc(this.studentsRef, id);
    await deleteDoc(docRef);
  }

  async getActive(): Promise<Student[]> {
    const q = query(
      this.studentsRef,
      where('status', '==', 'active'),
      orderBy('fullName')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
  }

  async getAll(): Promise<Student[]> {
    const q = query(this.studentsRef, orderBy('fullName'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
  }

  // ... resto das funções seguem o mesmo padrão
}

// Factory e Hook
export function createStudentService(academyId: string) {
  return new StudentService(academyId);
}

// Para uso em componentes React
import { useMemo } from 'react';
import { useAcademy } from '@/contexts/AcademyContext';

export function useStudentService() {
  const { academyId } = useAcademy();
  if (!academyId) throw new Error('No academy selected');
  return useMemo(() => createStudentService(academyId), [academyId]);
}
```

---

### 2. classService.ts (15 funções)

| Função | Modificação |
|--------|-------------|
| `list()` | `collection(db, 'classes')` → `this.classesRef` |
| `getById(id)` | Mudar collection ref |
| `getByDayOfWeek(dayOfWeek)` | Mudar collection ref |
| `getCurrentClass()` | Mudar collection ref |
| `getTodayClasses()` | Mudar collection ref |
| `getClassesForDate(date)` | Mudar collection ref |
| `getByCategory(category)` | Mudar collection ref |
| `create(classData)` | Mudar collection ref |
| `update(id, data)` | Mudar collection ref |
| `delete(id)` | Mudar collection ref |
| `hardDelete(id)` | Mudar collection ref |
| `getWeeklySchedule()` | Mudar collection ref |
| `addStudent(classId, studentId)` | Mudar collection ref |
| `removeStudent(classId, studentId)` | Mudar collection ref |
| `toggleStudent(classId, studentId)` | Mudar collection ref |

---

### 3. attendanceService.ts (17 funções)

| Função | Modificação Especial |
|--------|---------------------|
| `getByDateAndClass(date, classId)` | Mudar ref |
| `getTodayByClass(classId)` | Mudar ref |
| `getByStudent(studentId, limitCount?)` | Mudar ref |
| `getByDateRange(startDate, endDate, filters?)` | Mudar ref |
| `isStudentPresent(studentId, classId, date)` | Mudar ref |
| `getPresentStudentIds(classId, date?)` | Mudar ref |
| `markPresent(...)` | Mudar ref + **atualizar studentsRef** |
| `checkAttendanceMilestone(...)` | Mudar ref + **chamar achievementService com academyId** |
| `checkAnniversaryMilestone(...)` | Mudar ref + **chamar achievementService com academyId** |
| `unmarkPresent(...)` | Mudar ref + **atualizar studentsRef** |
| `bulkMarkPresent(...)` | Mudar ref |
| `getStudentAttendanceCount(studentId)` | Mudar ref |
| `getTotalStudentAttendanceCount(...)` | Mudar ref |
| `getMonthlyStats(month)` | Mudar ref |
| `getTodayTotal()` | Mudar ref |
| `getStudentAttendanceRate(...)` | Mudar ref |
| `delete(id)` | Mudar ref |
| `recalculateAchievementsForStudent(...)` | **Chamar outros services com academyId** |
| `recalculateAllAchievements(createdBy)` | **Chamar studentService com academyId** |

**Atenção:** Este service tem chamadas cross-service. Precisa receber outros services injetados:

```typescript
class AttendanceService {
  private academyId: string;
  private achievementService: AchievementService;
  private studentService: StudentService;

  constructor(
    academyId: string,
    achievementService?: AchievementService,
    studentService?: StudentService
  ) {
    this.academyId = academyId;
    this.achievementService = achievementService || createAchievementService(academyId);
    this.studentService = studentService || createStudentService(academyId);
  }

  // ...
}
```

---

### 4. financialService.ts (15 funções)

| Função | Modificação |
|--------|-------------|
| `list(filters?)` | Mudar collection ref |
| `getById(id)` | Mudar collection ref |
| `getByStudent(studentId)` | Mudar collection ref |
| `getPending()` | Mudar collection ref |
| `getOverdue()` | Mudar collection ref |
| `getPaidThisMonth()` | Mudar collection ref |
| `getMonthlySummary(month)` | Mudar collection ref |
| `create(data, createdBy)` | Mudar collection ref |
| `generateMonthlyTuitions(...)` | Mudar collection ref |
| `markAsPaid(id, method, paymentDate?)` | Mudar collection ref |
| `markOverduePayments()` | Mudar collection ref |
| `cancel(id)` | Mudar collection ref |
| `update(id, data)` | Mudar collection ref |
| `delete(id)` | Mudar collection ref |
| `getRevenueStats(startDate, endDate)` | Mudar collection ref |
| `getWhatsAppReminderLink(...)` | Sem mudança (não usa Firestore) |

---

### 5. achievementService.ts (20 funções)

| Função | Modificação |
|--------|-------------|
| `getByStudent(studentId)` | Mudar collection ref |
| `getForStudent(studentId)` | Mudar collection ref |
| `getById(id)` | Mudar collection ref |
| `getByType(studentId, type)` | Mudar collection ref |
| `getPublic(studentId)` | Mudar collection ref |
| `getRecent(limitCount?)` | Mudar collection ref |
| `getCompetitions(studentId)` | Mudar collection ref |
| `getGraduations(studentId)` | Mudar collection ref |
| `getMilestones(studentId)` | Mudar collection ref |
| `create(data, createdBy?)` | Mudar collection ref |
| `createGraduation(...)` | Mudar collection ref |
| `createCompetitionAchievement(...)` | Mudar collection ref |
| `createMilestone(...)` | Mudar collection ref |
| `createAttendanceMilestone(...)` | Mudar collection ref |
| `createAnniversaryMilestone(...)` | Mudar collection ref |
| `update(id, data)` | Mudar collection ref |
| `delete(id)` | Mudar collection ref |
| `togglePublic(id)` | Mudar collection ref |
| `getMedalCount(studentId)` | Mudar collection ref |
| `getCountByType(studentId)` | Mudar collection ref |
| `getTimeline(studentId)` | Mudar collection ref |

---

### 6. beltProgressionService.ts (10 funções)

| Função | Modificação Especial |
|--------|---------------------|
| `getByStudent(studentId)` | Mudar ref |
| `getById(id)` | Mudar ref |
| `checkEligibility(studentId)` | Mudar ref + **chamar studentService e attendanceService** |
| `getEligibleStudents()` | **Chamar studentService.getActive()** |
| `promote(...)` | Mudar ref + **chamar studentService e achievementService** |
| `addStripe(...)` | Mudar ref + **chamar studentService e achievementService** |
| `changeBelt(...)` | Mudar ref + **chamar studentService e achievementService** |
| `getBeltDistribution()` | **Chamar studentService** |
| `getRecentPromotions(limitCount?)` | Mudar ref |
| `getStudentJourney(studentId)` | Mudar ref |

**Cross-service dependencies:**
```typescript
class BeltProgressionService {
  constructor(
    academyId: string,
    studentService?: StudentService,
    attendanceService?: AttendanceService,
    achievementService?: AchievementService
  ) {
    // ...
  }
}
```

---

### 7. competitionService.ts (17 funções)

| Função | Modificação |
|--------|-------------|
| `list()` | Mudar collection ref |
| `getUpcoming()` | Mudar collection ref |
| `getCompleted()` | Mudar collection ref |
| `getById(id)` | Mudar collection ref |
| `create(data, createdBy)` | Mudar collection ref |
| `update(id, data)` | Mudar collection ref |
| `updateTransportStatus(...)` | Mudar collection ref |
| `addCustomWeightCategory(...)` | Mudar collection ref |
| `removeCustomWeightCategory(...)` | Mudar collection ref |
| `delete(id)` | Mudar ref + **cascade delete competitionResults** |
| `enrollStudent(...)` | Mudar collection ref |
| `unenrollStudent(...)` | Mudar collection ref |
| `toggleEnrollment(...)` | Mudar collection ref |
| `updateStatus(...)` | Mudar collection ref |
| `getForStudent(studentId)` | Mudar collection ref |
| `addResult(...)` | Mudar **competitionResults** ref |
| `getResultsForCompetition(...)` | Mudar **competitionResults** ref |
| `getResultsForStudent(...)` | Mudar **competitionResults** ref |
| `getMedalCount(studentId)` | Mudar **competitionResults** ref |
| `updateResult(...)` | Mudar **competitionResults** ref |
| `deleteResult(id)` | Mudar **competitionResults** ref |
| `getResultById(id)` | Mudar **competitionResults** ref |

---

### 8. competitionEnrollmentService.ts (12 funções)

| Função | Modificação |
|--------|-------------|
| `enroll(data, enrolledBy?)` | Mudar collection ref |
| `getByCompetitionAndStudent(...)` | Mudar collection ref |
| `getByCompetition(competitionId)` | Mudar collection ref |
| `getByStudent(studentId)` | Mudar collection ref |
| `update(id, data)` | Mudar collection ref |
| `delete(id)` | Mudar collection ref |
| `deleteByCompetition(competitionId)` | Mudar collection ref |
| `getTransportList(competitionId)` | Mudar collection ref |
| `getTransportStats(competitionId)` | Mudar collection ref |
| `getByCategory(...)` | Mudar collection ref |
| `isEnrolled(...)` | Mudar collection ref |
| `getCount(competitionId)` | Mudar collection ref |

---

### 9. planService.ts (11 funções)

| Função | Modificação Especial |
|--------|---------------------|
| `list()` | Mudar ref |
| `getActive()` | Mudar ref |
| `getById(id)` | Mudar ref |
| `create(data)` | Mudar ref |
| `update(id, data)` | Mudar ref + **atualizar students collection** |
| `delete(id)` | Mudar ref |
| `addStudent(planId, studentId)` | Mudar ref |
| `removeStudent(planId, studentId)` | Mudar ref |
| `toggleStudent(planId, studentId)` | Mudar ref + **atualizar students collection** |
| `getStudentsByPlan(planId)` | Mudar ref |
| `getPlanForStudent(studentId)` | Mudar ref |

---

### 10. linkCodeService.ts (12 funções)

| Função | Modificação |
|--------|-------------|
| `generate(studentId, studentName, createdBy)` | Mudar collection ref |
| `getByCode(code)` | Mudar collection ref |
| `validate(code)` | Mudar collection ref |
| `markAsUsed(code, userId)` | Mudar collection ref |
| `getActiveForStudent(studentId)` | Mudar collection ref |
| `getForStudent(studentId)` | Mudar collection ref |
| `getById(id)` | Mudar collection ref |
| `delete(id)` | Mudar collection ref |
| `cleanupExpired()` | Mudar collection ref |
| `invalidate(studentId)` | Mudar collection ref |
| `getPending()` | Mudar collection ref |
| `getRecentlyUsed(limitCount?)` | Mudar collection ref |

---

### 11. assessmentService.ts (10 funções)

| Função | Modificação |
|--------|-------------|
| `getByStudent(studentId, limitCount?)` | Mudar collection ref |
| `getLatest(studentId)` | Mudar collection ref |
| `getById(id)` | Mudar collection ref |
| `create(data)` | Mudar collection ref |
| `update(id, data)` | Mudar collection ref |
| `delete(id)` | Mudar collection ref |
| `getEvolution(studentId, count?)` | Mudar collection ref |
| `getRecent(limitCount?)` | Mudar collection ref |
| `calculateOverallScore(scores)` | Sem mudança (não usa Firestore) |
| `getPerformanceLevel(overallScore)` | Sem mudança (não usa Firestore) |

---

### 12. settingsService.ts (2 funções)

| Função | Modificação |
|--------|-------------|
| `getAcademySettings()` | Mudar para `academies/{academyId}` doc |
| `saveAcademySettings(settings)` | Mudar para `academies/{academyId}` doc |

```typescript
// Antes
const settingsRef = doc(db, 'settings', 'academy');

// Depois
const academyRef = doc(db, 'academies', this.academyId);
// Settings agora ficam no próprio documento da academia
```

---

## Estratégia B: Banco Novo (Clean Start) - RECOMENDADA

### Vantagens
1. **Zero risco** para usuários atuais
2. **Arquitetura limpa** desde o início
3. **Testes isolados** antes de migrar
4. **Rollback fácil** (voltar ao banco antigo)

### Implementação

#### Passo 1: Criar Novo Projeto Firebase

```bash
# Criar novo projeto no Firebase Console
# Nome sugerido: marcusjj-v2 ou marcusjj-multi

# Ou usar mesmo projeto com diferentes collections (menos recomendado)
```

#### Passo 2: Configuração Dual

```typescript
// src/lib/firebase/config.ts

// Banco atual (legado)
const legacyConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // ...
};

// Banco novo (multi-tenant)
const multiTenantConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_V2_API_KEY,
  // ...
};

// Feature flag para migração gradual
const USE_MULTI_TENANT = process.env.NEXT_PUBLIC_USE_MULTI_TENANT === 'true';

export const db = USE_MULTI_TENANT
  ? getFirestore(initializeApp(multiTenantConfig, 'multi'))
  : getFirestore(initializeApp(legacyConfig));
```

#### Passo 3: Script de Migração de Dados

```typescript
// scripts/migrate-to-multi-tenant.ts

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar ambos os bancos
const legacyApp = initializeApp({
  credential: cert('./legacy-service-account.json'),
}, 'legacy');

const newApp = initializeApp({
  credential: cert('./new-service-account.json'),
}, 'new');

const legacyDb = getFirestore(legacyApp);
const newDb = getFirestore(newApp);

const ACADEMY_ID = 'tropa23';

const COLLECTIONS = [
  'users',
  'students',
  'classes',
  'attendance',
  'financials',
  'achievements',
  'beltProgressions',
  'competitions',
  'competitionResults',
  'competitionEnrollments',
  'plans',
  'linkCodes',
  'assessments',
];

async function migrateCollection(collectionName: string) {
  console.log(`Migrando ${collectionName}...`);

  const snapshot = await legacyDb.collection(collectionName).get();
  const batch = newDb.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const newRef = newDb
      .collection('academies')
      .doc(ACADEMY_ID)
      .collection(collectionName)
      .doc(doc.id);

    batch.set(newRef, doc.data());
    count++;

    // Firestore batch limit is 500
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`  ${count} docs migrados...`);
    }
  }

  await batch.commit();
  console.log(`✓ ${collectionName}: ${count} docs migrados`);
}

async function migrateSettings() {
  console.log('Migrando settings para documento da academia...');

  const settingsDoc = await legacyDb.collection('settings').doc('academy').get();

  if (settingsDoc.exists) {
    await newDb.collection('academies').doc(ACADEMY_ID).set({
      ...settingsDoc.data(),
      slug: 'tropa23',
      createdAt: new Date(),
    });
    console.log('✓ Settings migrados para academies/tropa23');
  }
}

async function createUserMappings() {
  console.log('Criando mappings de usuários...');

  const usersSnapshot = await newDb
    .collection('academies')
    .doc(ACADEMY_ID)
    .collection('users')
    .get();

  const batch = newDb.batch();

  for (const userDoc of usersSnapshot.docs) {
    const mappingRef = newDb.collection('userAcademyMapping').doc(userDoc.id);
    batch.set(mappingRef, {
      academyIds: [ACADEMY_ID],
      primaryAcademyId: ACADEMY_ID,
    });
  }

  await batch.commit();
  console.log(`✓ ${usersSnapshot.size} user mappings criados`);
}

async function main() {
  console.log('=== Iniciando Migração Multi-Tenant ===\n');

  // 1. Migrar settings primeiro (cria o documento da academia)
  await migrateSettings();

  // 2. Migrar todas as collections
  for (const collection of COLLECTIONS) {
    await migrateCollection(collection);
  }

  // 3. Criar user mappings
  await createUserMappings();

  console.log('\n=== Migração Completa! ===');
}

main().catch(console.error);
```

#### Passo 4: Verificação Pós-Migração

```typescript
// scripts/verify-migration.ts

async function verify() {
  const collections = [...COLLECTIONS];

  for (const col of collections) {
    const legacyCount = (await legacyDb.collection(col).count().get()).data().count;
    const newCount = (await newDb
      .collection('academies')
      .doc(ACADEMY_ID)
      .collection(col)
      .count()
      .get()).data().count;

    const status = legacyCount === newCount ? '✓' : '✗';
    console.log(`${status} ${col}: ${legacyCount} → ${newCount}`);
  }
}
```

---

## Firestore Security Rules (Multi-Tenant)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User-Academy mapping (para saber quais academias o user pode acessar)
    match /userAcademyMapping/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Apenas via Admin SDK
    }

    // Academias e seus dados
    match /academies/{academyId} {

      // Função: verificar se user pertence à academia
      function isAcademyMember() {
        return exists(/databases/$(database)/documents/academies/$(academyId)/users/$(request.auth.uid));
      }

      // Função: verificar role do user na academia
      function getUserRole() {
        return get(/databases/$(database)/documents/academies/$(academyId)/users/$(request.auth.uid)).data.role;
      }

      function isAdmin() {
        return isAcademyMember() && getUserRole() == 'admin';
      }

      function isAdminOrInstructor() {
        return isAcademyMember() && getUserRole() in ['admin', 'instructor'];
      }

      // Documento da academia (settings)
      allow read: if isAcademyMember();
      allow write: if isAdmin();

      // Users da academia
      match /users/{userId} {
        allow read: if isAcademyMember();
        allow write: if isAdmin() || request.auth.uid == userId;
      }

      // Students - admin/instructor podem tudo, student/guardian só leitura do próprio
      match /students/{studentId} {
        allow read: if isAcademyMember();
        allow write: if isAdminOrInstructor();
      }

      // Classes
      match /classes/{classId} {
        allow read: if isAcademyMember();
        allow write: if isAdminOrInstructor();
      }

      // Attendance
      match /attendance/{attendanceId} {
        allow read: if isAcademyMember();
        allow write: if isAdminOrInstructor();
      }

      // Financials - apenas admin
      match /financials/{financialId} {
        allow read: if isAcademyMember();
        allow write: if isAdmin();
      }

      // Achievements
      match /achievements/{achievementId} {
        allow read: if isAcademyMember();
        allow write: if isAdminOrInstructor();
      }

      // Belt Progressions
      match /beltProgressions/{progressionId} {
        allow read: if isAcademyMember();
        allow write: if isAdminOrInstructor();
      }

      // Competitions
      match /competitions/{competitionId} {
        allow read: if isAcademyMember();
        allow write: if isAdminOrInstructor();
      }

      match /competitionResults/{resultId} {
        allow read: if isAcademyMember();
        allow write: if isAdminOrInstructor();
      }

      match /competitionEnrollments/{enrollmentId} {
        allow read: if isAcademyMember();
        allow write: if isAdminOrInstructor();
      }

      // Plans
      match /plans/{planId} {
        allow read: if isAcademyMember();
        allow write: if isAdmin();
      }

      // Link Codes
      match /linkCodes/{codeId} {
        allow read: if isAcademyMember();
        allow write: if isAdminOrInstructor();
      }

      // Assessments
      match /assessments/{assessmentId} {
        allow read: if isAcademyMember();
        allow write: if isAdminOrInstructor();
      }
    }
  }
}
```

---

## Checklist de Implementação

### Fase 1: Setup (1-2 dias)
- [ ] Decidir estratégia (A ou B)
- [ ] Se B: Criar novo projeto Firebase
- [ ] Criar `AcademyContext` e `AcademyProvider`
- [ ] Criar helper `collections.ts`
- [ ] Atualizar `ClientProviders` com `AcademyProvider`

### Fase 2: Services (3-5 dias)
- [ ] Refatorar `studentService.ts`
- [ ] Refatorar `classService.ts`
- [ ] Refatorar `attendanceService.ts`
- [ ] Refatorar `financialService.ts`
- [ ] Refatorar `achievementService.ts`
- [ ] Refatorar `beltProgressionService.ts`
- [ ] Refatorar `competitionService.ts`
- [ ] Refatorar `competitionEnrollmentService.ts`
- [ ] Refatorar `planService.ts`
- [ ] Refatorar `linkCodeService.ts`
- [ ] Refatorar `assessmentService.ts`
- [ ] Refatorar `settingsService.ts`

### Fase 3: Hooks e Componentes (2-3 dias)
- [ ] Criar hooks `useStudentService()`, etc.
- [ ] Atualizar todos os componentes que usam services
- [ ] Atualizar React Query keys para incluir academyId

### Fase 4: Migração de Dados (1 dia)
- [ ] Executar script de migração
- [ ] Verificar integridade dos dados
- [ ] Testar todas as funcionalidades

### Fase 5: Deploy e Cutover (1 dia)
- [ ] Deploy em ambiente de staging
- [ ] Testes finais
- [ ] Comunicar usuários (se necessário)
- [ ] Ativar feature flag ou trocar config
- [ ] Monitorar logs e erros

---

## Resumo de Contagem

| Item | Quantidade |
|------|------------|
| Services a modificar | 12 |
| Funções a modificar | ~150 |
| Collections a migrar | 13 |
| Security Rules | 1 arquivo |
| Novos arquivos | ~5 (contexts, helpers, scripts) |

---

## Próximos Passos Recomendados

1. **Escolher estratégia** (A ou B)
2. **Criar branch** `feature/multi-tenant`
3. **Começar pelo AcademyContext** (fundação)
4. **Refatorar um service por vez** (começar pelo studentService)
5. **Testar localmente** com emulador Firebase
6. **Migrar dados** quando tudo funcionar

Quer que eu comece a implementação de alguma parte específica?
