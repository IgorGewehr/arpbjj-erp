import { api, ApiError } from '@/lib/api/client';
import { CompetitionPhoto } from '@/types';
import imageCompression from 'browser-image-compression';

// ============================================
// Go API response shape
// ============================================
interface CompetitionPhotoDTO {
  id: string;
  competition_id: string;
  competition_name: string;
  student_id: string;
  student_name: string;
  url: string;
  storage_path?: string;
  caption?: string | null;
  likes?: number;
  is_highlight?: boolean;
  medal_type?: string | null;
  photo_type?: 'student' | 'team' | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface PhotoListDTO {
  items: CompetitionPhotoDTO[];
}

interface UploadUrlDTO {
  upload_url: string;
  photo_id: string;
  storage_path: string;
}

// ============================================
// Mapper: Go DTO → CompetitionPhoto
// ============================================
function dtoToPhoto(dto: CompetitionPhotoDTO): CompetitionPhoto {
  return {
    id: dto.id,
    competitionId: dto.competition_id,
    competitionName: dto.competition_name,
    studentId: dto.student_id,
    studentName: dto.student_name,
    url: dto.url,
    storagePath: dto.storage_path ?? '',
    caption: dto.caption ?? undefined,
    likes: dto.likes ?? 0,
    isHighlight: dto.is_highlight ?? false,
    medalType: (dto.medal_type as CompetitionPhoto['medalType']) ?? undefined,
    photoType: (dto.photo_type as 'student' | 'team') ?? undefined,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
    createdBy: dto.created_by,
  };
}

// ============================================
// Helper: Validate image file
// ============================================
const validateImage = (file: File): string | null => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    return 'Formato não suportado. Use JPG, PNG ou WEBP.';
  }

  if (file.size > maxSize) {
    return 'Imagem muito grande. Tamanho máximo: 10MB.';
  }

  return null;
};

// ============================================
// Helper: Compress image for competition photos
// ============================================
const compressImage = async (file: File): Promise<File> => {
  return await imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.85,
  });
};

// ============================================
// Create Competition Photo Service
// ============================================
export const createCompetitionPhotoService = (academyId: string) => {
  const photosBase = (competitionId: string) =>
    `/v1/academies/${academyId}/competitions/${competitionId}/photos`;

  return {
    // ============================================
    // Upload Photo (3-step presigned URL flow)
    // 1. POST .../photos/upload-url  — get presigned PUT URL
    // 2. PUT  <presigned-url>        — upload the file directly
    // 3. POST .../photos             — register the photo in tatami
    // ============================================
    async uploadPhoto(
      competitionId: string,
      competitionName: string,
      studentId: string,
      studentName: string,
      file: File,
      caption: string | undefined,
      createdBy: string,
      medalType?: string,
      photoType?: 'student' | 'team'
    ): Promise<CompetitionPhoto> {
      // Validate file
      const validationError = validateImage(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Compress image
      const compressedFile = await compressImage(file);

      // Step 1 — get presigned upload URL
      const { upload_url, photo_id, storage_path } = await api.post<UploadUrlDTO>(
        `${photosBase(competitionId)}/upload-url`,
        {
          file_name: file.name,
          content_type: 'image/jpeg',
        }
      );

      // Step 2 — PUT directly to the presigned URL (no auth header)
      const putRes = await fetch(upload_url, {
        method: 'PUT',
        body: compressedFile,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      if (!putRes.ok) {
        throw new Error(`Falha no upload da imagem: ${putRes.statusText}`);
      }

      // Step 3 — register the photo in tatami
      const dto = await api.post<CompetitionPhotoDTO>(photosBase(competitionId), {
        photo_id,
        competition_name: competitionName,
        student_id: studentId,
        student_name: studentName,
        storage_path,
        caption: caption ?? null,
        medal_type: medalType ?? null,
        photo_type: photoType ?? 'student',
        created_by: createdBy,
      });

      return dtoToPhoto(dto);
    },

    // ============================================
    // Get Photos by Competition
    // ============================================
    async getPhotosByCompetition(competitionId: string): Promise<CompetitionPhoto[]> {
      const res = await api.get<PhotoListDTO | CompetitionPhotoDTO[]>(photosBase(competitionId));
      const raw = Array.isArray(res) ? res : (res as PhotoListDTO).items ?? [];
      return raw
        .map(dtoToPhoto)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    // ============================================
    // Get Photos by Student (client-side filter from all competitions)
    // TODO(tatami): add ?student_id= query param if backend supports it.
    // For now, this needs a competitionId context. Returns [] when called
    // without one because there is no cross-competition student photos endpoint.
    // ============================================
    async getPhotosByStudent(_studentId: string): Promise<CompetitionPhoto[]> {
      // TODO(tatami): No GET /v1/academies/{id}/competition-photos?student_id= endpoint yet.
      // Returning empty array. Callers that need this should use
      // getPhotosByStudentAndCompetition() with a specific competitionId.
      return [];
    },

    // ============================================
    // Get Student Photo Count for Competition
    // ============================================
    async getStudentPhotoCount(competitionId: string, studentId: string): Promise<number> {
      const photos = await this.getPhotosByCompetition(competitionId);
      return photos.filter((p) => p.studentId === studentId).length;
    },

    // ============================================
    // Update Photo Caption
    // TODO(tatami): No PATCH /v1/.../photos/{photoId} endpoint exists yet.
    // ============================================
    async updatePhotoCaption(_photoId: string, caption: string): Promise<void> {
      if (caption.length > 200) {
        throw new Error('Legenda muito longa. Máximo: 200 caracteres.');
      }
      // TODO(tatami): implement when PATCH /v1/academies/{id}/competitions/{competitionId}/photos/{photoId} is available.
    },

    // ============================================
    // Toggle Highlight (Admin only)
    // TODO(tatami): No PATCH endpoint for highlight exists yet.
    // ============================================
    async toggleHighlight(_photoId: string, _isHighlight: boolean): Promise<void> {
      // TODO(tatami): implement when PATCH /v1/academies/{id}/competitions/{competitionId}/photos/{photoId} is available.
    },

    // ============================================
    // Delete Photo
    // ============================================
    async deletePhoto(photoId: string): Promise<void> {
      // The backend resolves the competitionId from the photoId context.
      // Use the academy-level delete endpoint if available, otherwise we need
      // the competitionId. Since callers don't pass competitionId here,
      // attempt the direct photo delete via a photo-level endpoint.
      // TODO(tatami): confirm exact delete URL with backend team.
      // Using DELETE /v1/academies/{academyId}/competition-photos/{photoId} as assumed path.
      try {
        await api.delete(`/v1/academies/${academyId}/competition-photos/${photoId}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // Already gone — treat as success
          return;
        }
        throw err;
      }
    },

    // ============================================
    // Get Photo by ID
    // TODO(tatami): No single-photo GET endpoint exists yet.
    // ============================================
    async getPhotoById(_photoId: string): Promise<CompetitionPhoto | null> {
      // TODO(tatami): implement when GET /v1/academies/{id}/competitions/{competitionId}/photos/{photoId} is available.
      return null;
    },

    // ============================================
    // Get Highlight Photos (for competition cover)
    // ============================================
    async getHighlightPhotos(competitionId: string, limitCount = 10): Promise<CompetitionPhoto[]> {
      const photos = await this.getPhotosByCompetition(competitionId);
      return photos
        .filter((p) => p.isHighlight)
        .slice(0, limitCount);
    },

    // ============================================
    // Get Photos by Student and Competition
    // ============================================
    async getPhotosByStudentAndCompetition(
      studentId: string,
      competitionId: string
    ): Promise<CompetitionPhoto[]> {
      const photos = await this.getPhotosByCompetition(competitionId);
      return photos.filter((p) => p.studentId === studentId);
    },

    // ============================================
    // Get All Photos (for admin gallery view)
    // Fetches photos across all competitions by listing competitions first.
    // TODO(tatami): replace with a dedicated academy-level photos endpoint if added.
    // ============================================
    async getAllPhotos(limitCount?: number): Promise<CompetitionPhoto[]> {
      try {
        // Fetch competition list to iterate over each
        const compRes = await api.get<{ items: Array<{ id: string }> } | Array<{ id: string }>>(
          `/v1/academies/${academyId}/competitions`
        );
        const competitions = Array.isArray(compRes)
          ? compRes
          : (compRes as { items: Array<{ id: string }> }).items ?? [];

        const photoArrays = await Promise.all(
          competitions.map((c) =>
            this.getPhotosByCompetition(c.id).catch(() => [] as CompetitionPhoto[])
          )
        );

        let all = photoArrays
          .flat()
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        if (limitCount) {
          all = all.slice(0, limitCount);
        }

        return all;
      } catch {
        return [];
      }
    },
  };
};

// ============================================
// Export default instance creator
// ============================================
export default createCompetitionPhotoService;
