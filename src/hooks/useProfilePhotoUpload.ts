import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { createStudentService } from '@/services/studentService';
import imageCompression from 'browser-image-compression';

interface UseProfilePhotoUploadProps {
  academyId: string;
  studentId: string;
  onSuccess?: (photoUrl: string) => void;
  onError?: (error: Error) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// Helper: Create cropped image blob from canvas
// ============================================
const createCroppedImage = async (
  imageSrc: string,
  cropArea: CropArea
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Set canvas size to crop area
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      // Draw cropped image
      ctx.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        0.85
      );
    };
    image.onerror = () => reject(new Error('Failed to load image'));
  });
};

// ============================================
// Helper: Validate image file
// ============================================
const validateImage = (file: File): string | null => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return 'Formato não suportado. Use JPG, PNG ou WEBP.';
  }

  if (file.size > maxSize) {
    return 'Imagem muito grande. Tamanho máximo: 5MB.';
  }

  return null;
};

// ============================================
// Hook: Profile Photo Upload
// ============================================
export function useProfilePhotoUpload({
  academyId,
  studentId,
  onSuccess,
  onError,
}: UseProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPhoto = async (file: File, cropArea?: CropArea) => {
    try {
      setUploading(true);
      setError(null);

      // Validate file
      const validationError = validateImage(file);
      if (validationError) {
        throw new Error(validationError);
      }

      let imageBlob: Blob = file;

      // If crop area provided, crop the image
      if (cropArea) {
        const imageSrc = URL.createObjectURL(file);
        imageBlob = await createCroppedImage(imageSrc, cropArea);
        URL.revokeObjectURL(imageSrc);
      }

      // Compress image (max 1024x1024, 85% quality)
      const compressedFile = await imageCompression(
        new File([imageBlob], 'profile.jpg', { type: 'image/jpeg' }),
        {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
          fileType: 'image/jpeg',
        }
      );

      // Upload to Firebase Storage
      const storagePath = `/academies/${academyId}/students/${studentId}/profile.jpg`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, compressedFile, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=3600, must-revalidate',
      });

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore
      const studentService = createStudentService(academyId);
      await studentService.update(studentId, { photoUrl: downloadURL });

      onSuccess?.(downloadURL);
      return downloadURL;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar foto';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async () => {
    try {
      setUploading(true);
      setError(null);

      // Delete from Storage
      const storagePath = `/academies/${academyId}/students/${studentId}/profile.jpg`;
      const storageRef = ref(storage, storagePath);

      try {
        await deleteObject(storageRef);
      } catch (err) {
        // Ignore if file doesn't exist
        if ((err as { code?: string }).code !== 'storage/object-not-found') {
          throw err;
        }
      }

      // Update Firestore
      const studentService = createStudentService(academyId);
      await studentService.update(studentId, { photoUrl: '' });

      onSuccess?.('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover foto';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadPhoto,
    deletePhoto,
    uploading,
    error,
  };
}
