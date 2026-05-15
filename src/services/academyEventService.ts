import {
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit as fsLimit,
  Timestamp,
  DocumentSnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { collections } from '@/lib/firebase/collections';
import { AcademyEvent } from '@/types';

const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Helper: Convert Firestore document to AcademyEvent
// ============================================
const docToEvent = (doc: DocumentSnapshot, academyId: string): AcademyEvent => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    academyId,
    title: data.title,
    slug: data.slug,
    description: data.description,
    coverUrl: data.coverUrl,
    coverStoragePath: data.coverStoragePath,
    startDate: data.startDate instanceof Timestamp
      ? data.startDate.toDate()
      : new Date(data.startDate),
    endDate: data.endDate instanceof Timestamp
      ? data.endDate.toDate()
      : data.endDate
        ? new Date(data.endDate)
        : undefined,
    location: data.location,
    ctaUrl: data.ctaUrl,
    ctaLabel: data.ctaLabel,
    isPublished: data.isPublished ?? false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
  };
};

// ============================================
// Academy Event Service (Multi-Tenant)
// ============================================
export class AcademyEventService {
  private academyId: string;
  private eventsRef: CollectionReference;

  constructor(academyId: string) {
    this.academyId = academyId;
    this.eventsRef = collections.events(academyId);
  }

  // ============================================
  // List events
  // ============================================
  async list(opts: { onlyPublished?: boolean } = {}): Promise<AcademyEvent[]> {
    const snapshot = await getDocs(this.eventsRef);
    let items = snapshot.docs.map((d) => docToEvent(d, this.academyId));

    if (opts.onlyPublished) {
      items = items.filter((e) => e.isPublished === true);
    }

    // Sort by startDate ascending (upcoming first); stable order for past
    return items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  // ============================================
  // Get by slug
  // ============================================
  async getBySlug(slug: string): Promise<AcademyEvent | null> {
    const q = query(this.eventsRef, where('slug', '==', slug), fsLimit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return docToEvent(snapshot.docs[0], this.academyId);
  }

  // ============================================
  // Get by id
  // ============================================
  async getById(id: string): Promise<AcademyEvent | null> {
    const docRef = collections.event_doc(this.academyId, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docToEvent(docSnap, this.academyId);
  }

  // ============================================
  // Create
  // ============================================
  async create(
    data: Omit<AcademyEvent, 'id' | 'academyId' | 'createdAt' | 'updatedAt'>
  ): Promise<AcademyEvent> {
    const now = new Date();

    const docData: Record<string, unknown> = {
      academyId: this.academyId,
      title: data.title,
      slug: data.slug,
      description: data.description,
      startDate: Timestamp.fromDate(new Date(data.startDate)),
      isPublished: data.isPublished ?? false,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    if (data.endDate) docData.endDate = Timestamp.fromDate(new Date(data.endDate));
    if (data.location) docData.location = data.location;
    if (data.coverUrl) docData.coverUrl = data.coverUrl;
    if (data.coverStoragePath) docData.coverStoragePath = data.coverStoragePath;
    if (data.ctaUrl) docData.ctaUrl = data.ctaUrl;
    if (data.ctaLabel) docData.ctaLabel = data.ctaLabel;

    const docRef = await addDoc(this.eventsRef, docData);

    return {
      id: docRef.id,
      academyId: this.academyId,
      title: data.title,
      slug: data.slug,
      description: data.description,
      coverUrl: data.coverUrl,
      coverStoragePath: data.coverStoragePath,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      location: data.location,
      ctaUrl: data.ctaUrl,
      ctaLabel: data.ctaLabel,
      isPublished: data.isPublished ?? false,
      createdAt: now,
      updatedAt: now,
    };
  }

  // ============================================
  // Update
  // ============================================
  async update(id: string, data: Partial<AcademyEvent>): Promise<AcademyEvent> {
    const docRef = collections.event_doc(this.academyId, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.fromDate(new Date()),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startDate !== undefined) {
      updateData.startDate = Timestamp.fromDate(new Date(data.startDate));
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate
        ? Timestamp.fromDate(new Date(data.endDate))
        : null;
    }
    if (data.location !== undefined) updateData.location = data.location;
    if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl;
    if (data.coverStoragePath !== undefined) updateData.coverStoragePath = data.coverStoragePath;
    if (data.ctaUrl !== undefined) updateData.ctaUrl = data.ctaUrl;
    if (data.ctaLabel !== undefined) updateData.ctaLabel = data.ctaLabel;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

    await updateDoc(docRef, updateData);

    const updated = await getDoc(docRef);
    return docToEvent(updated, this.academyId);
  }

  // ============================================
  // Remove
  // ============================================
  async remove(id: string): Promise<void> {
    const docRef = collections.event_doc(this.academyId, id);
    await deleteDoc(docRef);
  }

  // ============================================
  // Publish / Unpublish
  // ============================================
  async publish(id: string): Promise<AcademyEvent> {
    return this.update(id, { isPublished: true });
  }

  async unpublish(id: string): Promise<AcademyEvent> {
    return this.update(id, { isPublished: false });
  }
}

// ============================================
// Factory
// ============================================
export function createAcademyEventService(academyId: string): AcademyEventService {
  return new AcademyEventService(academyId);
}

// ============================================
// Legacy default-academy export for parity with sibling services
// ============================================
export const academyEventService = {
  list: (opts?: { onlyPublished?: boolean }) =>
    new AcademyEventService(DEFAULT_ACADEMY_ID).list(opts),
  getBySlug: (slug: string) => new AcademyEventService(DEFAULT_ACADEMY_ID).getBySlug(slug),
  getById: (id: string) => new AcademyEventService(DEFAULT_ACADEMY_ID).getById(id),
  create: (data: Omit<AcademyEvent, 'id' | 'academyId' | 'createdAt' | 'updatedAt'>) =>
    new AcademyEventService(DEFAULT_ACADEMY_ID).create(data),
  update: (id: string, data: Partial<AcademyEvent>) =>
    new AcademyEventService(DEFAULT_ACADEMY_ID).update(id, data),
  remove: (id: string) => new AcademyEventService(DEFAULT_ACADEMY_ID).remove(id),
  publish: (id: string) => new AcademyEventService(DEFAULT_ACADEMY_ID).publish(id),
  unpublish: (id: string) => new AcademyEventService(DEFAULT_ACADEMY_ID).unpublish(id),
};

export default academyEventService;
