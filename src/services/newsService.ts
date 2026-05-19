import { api } from '@/lib/api/client';
import { News } from '@/types';

const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Tatami API DTO (Go backend — snake_case)
// ============================================
interface NewsDTO {
  id: string;
  academy_id: string;
  title: string;
  body: string;
  image_url?: string;
  link_url?: string;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface NewsListDTO {
  items: NewsDTO[];
}

// ============================================
// Mapper: Tatami DTO → News
// Fields not present in the tatami DTO (slug, excerpt, content, coverStoragePath,
// tags, authorName, publishedAt) receive safe defaults so existing callers
// continue to compile and run without changes.
// ============================================
const dtoToNews = (dto: NewsDTO): News => ({
  id: dto.id,
  academyId: dto.academy_id,
  title: dto.title,
  slug: dto.id,             // tatami has no slug — use id as stable fallback
  excerpt: '',              // not stored in tatami; callers that render excerpt will show empty
  content: dto.body,        // tatami uses "body" for the full content
  coverUrl: dto.image_url,
  coverStoragePath: undefined,
  tags: undefined,
  isPublished: dto.is_pinned,
  publishedAt: dto.is_pinned ? new Date(dto.updated_at) : undefined,
  authorUid: dto.created_by,
  authorName: undefined,
  createdAt: new Date(dto.created_at),
  updatedAt: new Date(dto.updated_at),
});

// ============================================
// Mapper: News create/update payload → tatami body
// ============================================
const newsToBody = (
  data: Partial<Omit<News, 'id' | 'academyId' | 'createdAt' | 'updatedAt'>>,
): Record<string, unknown> => {
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  // Prefer "content" field; fall back to empty string
  if (data.content !== undefined) body.body = data.content;
  if (data.coverUrl !== undefined) body.image_url = data.coverUrl ?? null;
  if (data.isPublished !== undefined) body.is_pinned = data.isPublished;
  return body;
};

// ============================================
// News Service (Multi-Tenant)
// ============================================
export class NewsService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private base(): string {
    return `/v1/academies/${this.academyId}/news`;
  }

  // ============================================
  // List news
  // ============================================
  async list(opts: { onlyPublished?: boolean } = {}): Promise<News[]> {
    const res = await api.get<NewsListDTO>(`${this.base()}?limit=200&offset=0`);
    let items = (res.items ?? []).map(dtoToNews);

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
  // TODO(tatami): no GET-by-slug endpoint — falls back to scanning list
  // ============================================
  async getBySlug(slug: string): Promise<News | null> {
    const all = await this.list();
    return all.find((n) => n.slug === slug || n.id === slug) ?? null;
  }

  // ============================================
  // Get by id
  // ============================================
  async getById(id: string): Promise<News | null> {
    try {
      const dto = await api.get<NewsDTO>(`${this.base()}/${id}`);
      return dtoToNews(dto);
    } catch {
      return null;
    }
  }

  // ============================================
  // Create
  // ============================================
  async create(
    data: Omit<News, 'id' | 'academyId' | 'createdAt' | 'updatedAt'>,
  ): Promise<News> {
    const dto = await api.post<NewsDTO>(this.base(), newsToBody(data));
    return dtoToNews(dto);
  }

  // ============================================
  // Update
  // ============================================
  async update(id: string, data: Partial<News>): Promise<News> {
    const dto = await api.patch<NewsDTO>(`${this.base()}/${id}`, newsToBody(data));
    return dtoToNews(dto);
  }

  // ============================================
  // Remove
  // ============================================
  async remove(id: string): Promise<void> {
    await api.delete(`${this.base()}/${id}`);
  }

  // ============================================
  // Publish / Unpublish  (maps to is_pinned on the tatami side)
  // ============================================
  async publish(id: string): Promise<News> {
    return this.update(id, { isPublished: true });
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
