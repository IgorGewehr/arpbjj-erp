import { api } from '@/lib/api/client';
import { AcademyEvent } from '@/types';

const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Tatami API DTO (Go backend — snake_case)
// ============================================
interface AcademyEventDTO {
  id: string;
  academy_id: string;
  title: string;
  description: string;
  event_date: string;  // ISO8601
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface AcademyEventListDTO {
  items: AcademyEventDTO[];
}

// ============================================
// Mapper: Tatami DTO → AcademyEvent
// Fields not present in the tatami DTO (slug, coverUrl, coverStoragePath,
// endDate, location, ctaUrl, ctaLabel, isPublished) are given safe defaults
// so existing callers continue to compile and run without changes.
// ============================================
const dtoToEvent = (dto: AcademyEventDTO): AcademyEvent => ({
  id: dto.id,
  academyId: dto.academy_id,
  title: dto.title,
  slug: dto.id,               // tatami has no slug — use id as stable fallback
  description: dto.description,
  coverUrl: undefined,
  coverStoragePath: undefined,
  startDate: new Date(dto.event_date),
  endDate: undefined,
  location: undefined,
  ctaUrl: undefined,
  ctaLabel: undefined,
  isPublished: dto.is_pinned, // closest semantic match available in the DTO
  createdAt: new Date(dto.created_at),
  updatedAt: new Date(dto.updated_at),
});

// ============================================
// Mapper: AcademyEvent create/update payload → tatami body
// ============================================
const eventToBody = (
  data: Partial<Omit<AcademyEvent, 'id' | 'academyId' | 'createdAt' | 'updatedAt'>>,
): Record<string, unknown> => {
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.startDate !== undefined) {
    body.event_date =
      data.startDate instanceof Date
        ? data.startDate.toISOString()
        : new Date(data.startDate).toISOString();
  }
  if (data.isPublished !== undefined) body.is_pinned = data.isPublished;
  return body;
};

// ============================================
// Academy Event Service (Multi-Tenant)
// ============================================
export class AcademyEventService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private base(): string {
    return `/v1/academies/${this.academyId}/events`;
  }

  // ============================================
  // List events
  // ============================================
  async list(opts: { onlyPublished?: boolean } = {}): Promise<AcademyEvent[]> {
    const res = await api.get<AcademyEventListDTO>(`${this.base()}?limit=200&offset=0`);
    let items = (res.items ?? []).map(dtoToEvent);

    if (opts.onlyPublished) {
      items = items.filter((e) => e.isPublished === true);
    }

    // Sort by startDate ascending (upcoming first)
    return items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  // ============================================
  // Get by slug
  // TODO(tatami): no GET-by-slug endpoint — falls back to scanning list
  // ============================================
  async getBySlug(slug: string): Promise<AcademyEvent | null> {
    const all = await this.list();
    return all.find((e) => e.slug === slug || e.id === slug) ?? null;
  }

  // ============================================
  // Get by id
  // ============================================
  async getById(id: string): Promise<AcademyEvent | null> {
    try {
      const dto = await api.get<AcademyEventDTO>(`${this.base()}/${id}`);
      return dtoToEvent(dto);
    } catch {
      return null;
    }
  }

  // ============================================
  // Create
  // ============================================
  async create(
    data: Omit<AcademyEvent, 'id' | 'academyId' | 'createdAt' | 'updatedAt'>,
  ): Promise<AcademyEvent> {
    const dto = await api.post<AcademyEventDTO>(this.base(), eventToBody(data));
    return dtoToEvent(dto);
  }

  // ============================================
  // Update
  // ============================================
  async update(id: string, data: Partial<AcademyEvent>): Promise<AcademyEvent> {
    const dto = await api.patch<AcademyEventDTO>(`${this.base()}/${id}`, eventToBody(data));
    return dtoToEvent(dto);
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
