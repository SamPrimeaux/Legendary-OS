import { useCallback, useState } from 'react';
import { mediaClient } from '../api/mediaClient';

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (input: Parameters<typeof mediaClient.upload>[0]) => {
    setUploading(true);
    setError(null);
    try {
      return await mediaClient.upload(input);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Upload failed';
      setError(message);
      throw cause;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error, clearError: () => setError(null) };
}
