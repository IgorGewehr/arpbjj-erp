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
  orderBy,
  Timestamp,
  serverTimestamp,
  DocumentSnapshot,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, collections } from '@/lib/firebase';
import { CompetitionPhoto } from '@/types';
import imageCompression from 'browser-image-compression';

// ============================================
// Helper: Convert Firestore document to CompetitionPhoto
// ============================================
const docToPhoto = (doc: DocumentSnapshot): CompetitionPhoto => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    competitionId: data.competitionId,
    competitionName: data.competitionName,
    studentId: data.studentId,
    studentName: data.studentName,
    url: data.url,
    storagePath: data.storagePath,
    caption: data.caption,
    likes: data.likes ?? 0,
    isHighlight: data.isHighlight ?? false,
    medalType: data.medalType,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
    createdBy: data.createdBy,
  };
};

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
  const photosCollection = collections.competitionPhotos(academyId);

  return {
    // ============================================
    // Upload Photo
    // ============================================
    async uploadPhoto(
      competitionId: string,
      competitionName: string,
      studentId: string,
      studentName: string,
      file: File,
      caption: string | undefined,
      createdBy: string,
      medalType?: string
    ): Promise<CompetitionPhoto> {
      // Validate file
      const validationError = validateImage(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Compress image
      const compressedFile = await compressImage(file);

      // Generate unique photo ID
      const photoId = doc(collection(db, 'temp')).id;

      // Upload to Firebase Storage
      const storagePath = `/academies/${academyId}/competitions/${competitionId}/photos/${photoId}.jpg`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, compressedFile, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=3600, must-revalidate',
      });

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Create Firestore document
      const photoData = {
        competitionId,
        competitionName,
        studentId,
        studentName,
        url: downloadURL,
        storagePath,
        caption: caption || null,
        likes: 0,
        isHighlight: false,
        medalType: medalType || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy,
      };

      const docRef = await addDoc(photosCollection, photoData);

      // Return created photo
      const photoDoc = await getDoc(docRef);
      return docToPhoto(photoDoc);
    },

    // ============================================
    // Get Photos by Competition
    // ============================================
    async getPhotosByCompetition(competitionId: string): Promise<CompetitionPhoto[]> {
      const q = query(
        photosCollection,
        where('competitionId', '==', competitionId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToPhoto);
    },

    // ============================================
    // Get Photos by Student
    // ============================================
    async getPhotosByStudent(studentId: string): Promise<CompetitionPhoto[]> {
      const q = query(
        photosCollection,
        where('studentId', '==', studentId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToPhoto);
    },

    // ============================================
    // Get Student Photo Count for Competition
    // ============================================
    async getStudentPhotoCount(competitionId: string, studentId: string): Promise<number> {
      const q = query(
        photosCollection,
        where('competitionId', '==', competitionId),
        where('studentId', '==', studentId)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    },

    // ============================================
    // Update Photo Caption
    // ============================================
    async updatePhotoCaption(photoId: string, caption: string): Promise<void> {
      if (caption.length > 200) {
        throw new Error('Legenda muito longa. Máximo: 200 caracteres.');
      }

      const photoRef = doc(photosCollection, photoId);
      await updateDoc(photoRef, {
        caption,
        updatedAt: serverTimestamp(),
      });
    },

    // ============================================
    // Toggle Highlight (Admin only)
    // ============================================
    async toggleHighlight(photoId: string, isHighlight: boolean): Promise<void> {
      const photoRef = doc(photosCollection, photoId);
      await updateDoc(photoRef, {
        isHighlight,
        updatedAt: serverTimestamp(),
      });
    },

    // ============================================
    // Delete Photo
    // ============================================
    async deletePhoto(photoId: string): Promise<void> {
      // Get photo document
      const photoRef = doc(photosCollection, photoId);
      const photoDoc = await getDoc(photoRef);

      if (!photoDoc.exists()) {
        throw new Error('Foto não encontrada.');
      }

      const photo = docToPhoto(photoDoc);

      // Delete from Storage
      try {
        const storageRef = ref(storage, photo.storagePath);
        await deleteObject(storageRef);
      } catch (err) {
        // Ignore if file doesn't exist
        if ((err as { code?: string }).code !== 'storage/object-not-found') {
          throw err;
        }
      }

      // Delete from Firestore
      await deleteDoc(photoRef);
    },

    // ============================================
    // Get Photo by ID
    // ============================================
    async getPhotoById(photoId: string): Promise<CompetitionPhoto | null> {
      const photoRef = doc(photosCollection, photoId);
      const photoDoc = await getDoc(photoRef);

      if (!photoDoc.exists()) {
        return null;
      }

      return docToPhoto(photoDoc);
    },

    // ============================================
    // Get Highlight Photos (for competition cover)
    // ============================================
    async getHighlightPhotos(competitionId: string, limitCount = 10): Promise<CompetitionPhoto[]> {
      const q = query(
        photosCollection,
        where('competitionId', '==', competitionId),
        where('isHighlight', '==', true),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToPhoto);
    },

    // ============================================
    // Get Photos by Student and Competition
    // ============================================
    async getPhotosByStudentAndCompetition(
      studentId: string,
      competitionId: string
    ): Promise<CompetitionPhoto[]> {
      const q = query(
        photosCollection,
        where('studentId', '==', studentId),
        where('competitionId', '==', competitionId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToPhoto);
    },

    // ============================================
    // Get All Photos (for admin gallery view)
    // ============================================
    async getAllPhotos(limitCount?: number): Promise<CompetitionPhoto[]> {
      let q = query(photosCollection, orderBy('createdAt', 'desc'));

      if (limitCount) {
        q = query(q, firestoreLimit(limitCount));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToPhoto);
    },
  };
};

// ============================================
// Export default instance creator
// ============================================
export default createCompetitionPhotoService;
