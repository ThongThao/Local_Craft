import { apiClient, ApiResponse } from './client';

export interface UploadResponseDto {
  url: string;
  secure_url: string;
  public_id: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  storage: 'cloudinary' | 'local_fallback';
}

export const uploadApi = {
  /**
   * Upload an image to Cloudinary (or fallback storage)
   * @param file File or Blob object
   * @param folder Folder name on Cloudinary (e.g. 'localcraft/avatars', 'localcraft/products')
   */
  uploadImage: async (
    file: File | Blob,
    folder: string = 'localcraft/avatars'
  ): Promise<ApiResponse<UploadResponseDto>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return apiClient<UploadResponseDto>('/upload/', {
      method: 'POST',
      body: formData,
      requiresAuth: false,
    });
  },
};
