export type ImageVariantOptions = {
  width?: number;
  height?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  format?: 'webp' | 'jpeg' | 'png';
  quality?: number;
};

function clamp(value: number | undefined, min: number, max: number) {
  if (value == null || !Number.isFinite(value)) return undefined;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export async function renderCloudflareImageVariant(images: any, body: ReadableStream, options: ImageVariantOptions) {
  if (!images?.input) return null;
  const width = clamp(options.width, 1, 4096);
  const height = clamp(options.height, 1, 4096);
  const quality = clamp(options.quality, 30, 95) ?? 82;
  const format = options.format || 'webp';
  let pipeline = images.input(body);
  if (width || height) {
    pipeline = pipeline.transform({ width, height, fit: options.fit || 'scale-down' });
  }
  const output = await pipeline.output({ format: `image/${format}`, quality });
  return output.response();
}
