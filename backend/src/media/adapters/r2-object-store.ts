export type R2PutMetadata = {
  contentType: string;
  cacheControl?: string;
  customMetadata?: Record<string, string>;
};

export class R2MediaObjectStore {
  constructor(readonly bucket: R2Bucket, readonly bucketName = 'legendary-os') {}

  async get(key: string) { return this.bucket.get(key); }
  async head(key: string) { return this.bucket.head(key); }
  async delete(key: string) { await this.bucket.delete(key); }

  async put(key: string, value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream, metadata: R2PutMetadata) {
    return this.bucket.put(key, value, {
      httpMetadata: {
        contentType: metadata.contentType,
        cacheControl: metadata.cacheControl || 'public, max-age=31536000, immutable',
      },
      customMetadata: metadata.customMetadata,
    });
  }

  keyForHash(sha256: string, extension: string) {
    const ext = extension.replace(/^\./, '').replace(/[^a-z0-9]+/gi, '').toLowerCase() || 'bin';
    return `media/originals/${sha256}.${ext}`;
  }

  publicPath(key: string) {
    return `/assets/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
}
