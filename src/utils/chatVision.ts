export const VISION_MAX_IMAGES = 8;
export const VISION_MAX_BYTES = 12 * 1024 * 1024;
export const VISION_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp';

const VISION_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
};

export type VisionImagePayload = {
  data: string;
  mimeType: string;
};

export function mimeForVisionFile(file: File): string {
  const fromType = file.type.toLowerCase();
  if (VISION_MIME.has(fromType)) {
    return fromType === 'image/jpg' ? 'image/jpeg' : fromType;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MIME[ext] ?? '';
}

export function isVisionImageFile(file: File): boolean {
  return Boolean(mimeForVisionFile(file));
}

export function attachedImagesNote(count: number): string {
  return `[прикреплено изображений: ${count}]`;
}

export function persistableVisionContent(text: string, imageCount: number): string {
  const trimmed = text.trim();
  if (imageCount <= 0) return trimmed;
  const note = attachedImagesNote(imageCount);
  if (trimmed.includes('[прикреплено изображений:')) return trimmed;
  return trimmed ? `${trimmed}\n${note}` : note;
}

export function collectVisionFiles(
  incoming: File[],
  alreadyCount: number
): { files: File[]; errors: string[] } {
  const files: File[] = [];
  const errors: string[] = [];
  let remaining = VISION_MAX_IMAGES - alreadyCount;

  if (remaining <= 0) {
    errors.push(`Можно прикрепить не больше ${VISION_MAX_IMAGES} изображений.`);
    return { files, errors };
  }

  for (const file of incoming) {
    if (remaining <= 0) {
      errors.push(`Можно прикрепить не больше ${VISION_MAX_IMAGES} изображений.`);
      break;
    }
    if (!isVisionImageFile(file)) {
      errors.push(`«${file.name}» — нужен JPEG, PNG, WebP, GIF или BMP.`);
      continue;
    }
    if (file.size > VISION_MAX_BYTES) {
      errors.push(`«${file.name}» больше 12 МБ.`);
      continue;
    }
    files.push(file);
    remaining -= 1;
  }

  return { files, errors };
}

export function fileToBase64Data(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

export async function filesToVisionPayloads(files: File[]): Promise<VisionImagePayload[]> {
  const images: VisionImagePayload[] = [];
  for (const file of files) {
    images.push({
      data: await fileToBase64Data(file),
      mimeType: mimeForVisionFile(file) || 'image/jpeg',
    });
  }
  return images;
}
