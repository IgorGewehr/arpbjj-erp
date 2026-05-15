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
import { News } from '@/types';

const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Helper: Convert Firestore document to News
// ============================================
const docToNews = (doc: DocumentSnapshot, academyId: string): News => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    academyId,
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    content: data.content,
    coverUrl: data.coverUrl,
    coverStoragePath: data.coverStoragePath,
    tags: data.tags,
    isPublished: data.isPublished ?? false,
    publishedAt: data.publishedAt instanceof Timestamp
      ? data.publishedAt.toDate()
      : data.publishedAt
        ? new Date(data.publishedAt)
        : undefined,
    authorUid: data.authorUid,
    authorName: data.authorName,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
  };
};

// ============================================
// News Service (Multi-Tenant)
// ============================================
export class NewsService {
  private academyId: string;
  private newsRef: CollectionReference;

  constructor(academyId: string) {
    this.academyId = academyId;
    this.newsRef = collections.news(academyId);
  }

  // ============================================
  // List news
  // ============================================
  async list(opts: { onlyPublished?: boolean } = {}): Promise<News[]> {
    const snapshot = await getDocs(this.newsRef);
    let items = snapshot.docs.map((d) => docToNews(d, this.academyId));

    if (opts.onlyPublished) {
      items = items.filter((n) => n.isPublished === true);
    }

    // Sort: published first by publishedAt desc, then drafts by updatedAt desc
    return items.sort((a, b) => {
      const at = (a.publishedAt ?? a.updatedAt).getTime();
      const bt = (b.publishedAt ?? b.updatedAt).getTime();
      return bt - at;
    });
  }

  // ============================================
  // Get by slug
  // ============================================
  async getBySlug(slug: string): Promise<News | null> {
    const q = query(this.newsRef, where('slug', '==', slug), fsLimit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return docToNews(snapshot.docs[0], this.academyId);
  }

  // ============================================
  // Get by id
  // ============================================
  async getById(id: string): Promise<News | null> {
    const docRef = collections.news_doc(this.academyId, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docToNews(docSnap, this.academyId);
  }

  // ============================================
  // Create
  // ============================================
  async create(
    data: Omit<News, 'id' | 'academyId' | 'createdAt' | 'updatedAt'>
  ): Promise<News> {
    const now = new Date();

    const docData: Record<string, unknown> = {
      academyId: this.academyId,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      isPublished: data.isPublished ?? false,
      authorUid: data.authorUid,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    if (data.coverUrl) docData.coverUrl = data.coverUrl;
    if (data.coverStoragePath) docData.coverStoragePath = data.coverStoragePath;
    if (data.tags && data.tags.length > 0) docData.tags = data.tags;
    if (data.authorName) docData.authorName = data.authorName;
    if (data.publishedAt) {
      docData.publishedAt = Timestamp.fromDate(new Date(data.publishedAt));
    } else if (data.isPublished) {
      // If publishing without explicit publishedAt, stamp now
      docData.publishedAt = Timestamp.fromDate(now);
    }

    const docRef = await addDoc(this.newsRef, docData);

    return {
      id: docRef.id,
      academyId: this.academyId,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      coverUrl: data.coverUrl,
      coverStoragePath: data.coverStoragePath,
      tags: data.tags,
      isPublished: data.isPublished ?? false,
      publishedAt: data.publishedAt
        ? new Date(data.publishedAt)
        : data.isPublished
          ? now
          : undefined,
      authorUid: data.authorUid,
      authorName: data.authorName,
      createdAt: now,
      updatedAt: now,
    };
  }

  // ============================================
  // Update
  // ============================================
  async update(id: string, data: Partial<News>): Promise<News> {
    const docRef = collections.news_doc(this.academyId, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.fromDate(new Date()),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl;
    if (data.coverStoragePath !== undefined) updateData.coverStoragePath = data.coverStoragePath;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
    if (data.publishedAt !== undefined) {
      updateData.publishedAt = data.publishedAt
        ? Timestamp.fromDate(new Date(data.publishedAt))
        : null;
    }
    if (data.authorName !== undefined) updateData.authorName = data.authorName;

    await updateDoc(docRef, updateData);

    const updated = await getDoc(docRef);
    return docToNews(updated, this.academyId);
  }

  // ============================================
  // Remove
  // ============================================
  async remove(id: string): Promise<void> {
    const docRef = collections.news_doc(this.academyId, id);
    await deleteDoc(docRef);
  }

  // ============================================
  // Publish / Unpublish
  // ============================================
  async publish(id: string): Promise<News> {
    return this.update(id, {
      isPublished: true,
      publishedAt: new Date(),
    });
  }

  async unpublish(id: string): Promise<News> {
    return this.update(id, { isPublished: false });
  }
}

// ============================================
// Factory
// ============================================
export function createNewsService(academyId: string): NewsService {
  return new NewsService(academyId);
}

// ============================================
// Legacy default-academy export for parity with sibling services
// ============================================
export const newsService = {
  list: (opts?: { onlyPublished?: boolean }) =>
    new NewsService(DEFAULT_ACADEMY_ID).list(opts),
  getBySlug: (slug: string) => new NewsService(DEFAULT_ACADEMY_ID).getBySlug(slug),
  getById: (id: string) => new NewsService(DEFAULT_ACADEMY_ID).getById(id),
  create: (data: Omit<News, 'id' | 'academyId' | 'createdAt' | 'updatedAt'>) =>
    new NewsService(DEFAULT_ACADEMY_ID).create(data),
  update: (id: string, data: Partial<News>) =>
    new NewsService(DEFAULT_ACADEMY_ID).update(id, data),
  remove: (id: string) => new NewsService(DEFAULT_ACADEMY_ID).remove(id),
  publish: (id: string) => new NewsService(DEFAULT_ACADEMY_ID).publish(id),
  unpublish: (id: string) => new NewsService(DEFAULT_ACADEMY_ID).unpublish(id),
};

export default newsService;
