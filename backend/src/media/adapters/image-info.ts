import { mediaKindFor } from '../contracts';

export type InspectedImage = {
  sha256: string;
  mimeType: string;
  extension: string;
  bytes: number;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  orientation: number | null;
};

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function extensionFor(mimeType: string, filename: string) {
  const mime = mimeType.split(';')[0].trim().toLowerCase();
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/avif') return 'avif';
  if (mime === 'image/svg+xml') return 'svg';
  const match = filename.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return match?.[1] === 'jpeg' ? 'jpg' : match?.[1] || 'bin';
}

function dimensionsFromBytes(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        return { height: (bytes[offset + 5] << 8) + bytes[offset + 6], width: (bytes[offset + 7] << 8) + bytes[offset + 8] };
      }
      if (!length || length < 2) break;
      offset += 2 + length;
    }
  }
  if (bytes.length >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === 'VP8X') {
      const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
      return { width, height };
    }
  }
  return null;
}

export async function inspectMediaBytes(
  buffer: ArrayBuffer,
  filename: string,
  contentType = 'application/octet-stream',
  imagesBinding?: any,
): Promise<InspectedImage> {
  const sha256 = hex(await crypto.subtle.digest('SHA-256', buffer));
  const mimeType = contentType.split(';')[0].trim().toLowerCase() || 'application/octet-stream';
  const bytes = new Uint8Array(buffer);
  let dimensions = dimensionsFromBytes(bytes);
  let orientation: number | null = null;

  if (mediaKindFor(mimeType, filename) === 'image' && imagesBinding?.info) {
    try {
      const info = await imagesBinding.info(new Blob([buffer], { type: mimeType }).stream());
      if (Number(info?.width) > 0 && Number(info?.height) > 0) dimensions = { width: Number(info.width), height: Number(info.height) };
      if (Number(info?.orientation) > 0) orientation = Number(info.orientation);
    } catch {
      // Header parsing above remains the deterministic fallback.
    }
  }

  return {
    sha256,
    mimeType,
    extension: extensionFor(mimeType, filename),
    bytes: buffer.byteLength,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    aspectRatio: dimensions?.width && dimensions?.height ? dimensions.width / dimensions.height : null,
    orientation,
  };
}
