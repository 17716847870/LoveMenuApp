import { post } from './apiClient';

export type UploadImageResponse = {
  url: string;
  object_key: string;
  upload_url: string;
  expires_at: string;
};

type UploadableImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type UploadableAudio = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export const uploadApi = {
  async uploadImage(image: UploadableImage) {
    const name = image.fileName || `lovemenu-${Date.now()}.jpg`;
    const type = image.mimeType || 'image/jpeg';
    const { data } = await post<UploadImageResponse>('/uploads/images/sign', {
      file_name: name,
      mime_type: type,
    });

    const fileResponse = await fetch(image.uri);
    const blob = await fileResponse.blob();
    const uploadResponse = await fetch(data.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': type,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error('Upload image failed');
    }

    return {
      data,
    };
  },

  async uploadAudio(audio: UploadableAudio) {
    const name = audio.fileName || `lovemenu-voice-${Date.now()}.m4a`;
    const type = audio.mimeType || 'audio/mp4';
    const { data } = await post<UploadImageResponse>('/uploads/audio/sign', {
      file_name: name,
      mime_type: type,
    });

    const fileResponse = await fetch(audio.uri);
    const blob = await fileResponse.blob();
    const uploadResponse = await fetch(data.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': type,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error('Upload audio failed');
    }

    return {
      data,
      fileSize: blob.size,
    };
  },
};
