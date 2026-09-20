export const MAX_BYTES = 5 * 1024 * 1024;
export function detectImage(bytes) {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Image must be between 1 byte and 5 MB.');
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'Jpeg';
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return 'Png';
  if (String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') return 'WebP';
  throw new Error('Only JPEG, PNG, or WebP images are supported.');
}
export async function boundedBody(body) {
  if (!body) throw new Error('An image is required.');
  const reader = body.getReader(); const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Image exceeds 5 MB.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { result.set(chunk,offset); offset += chunk.length; }
  return result;
}
export function configureLimits({ ResourceLimits }) {
  ResourceLimits.width = 4096n; ResourceLimits.height = 4096n;
  ResourceLimits.area = 8000000n; ResourceLimits.memory = 96n * 1024n * 1024n;
  ResourceLimits.maxMemoryRequest = 96n * 1024n * 1024n;
  ResourceLimits.disk = 0n; ResourceLimits.listLength = 4n;
  ResourceLimits.maxProfileSize = 1024n * 1024n;
}
export function reencodeImage(bytes, kind, magick) {
  if (!['products','yard-sales','avatars'].includes(kind)) throw new Error('Invalid image category.');
  const format = detectImage(bytes);
  const { ImageMagick, MagickFormat } = magick;
  // Decode bytes with the chosen allowlisted codec; no URL, path, or auto-detected active formats.
  return ImageMagick.readCollection(bytes, MagickFormat[format], collection => {
    if (collection.length !== 1) throw new Error('Animated or multi-frame images are not supported.');
    const image = collection[0];
    if (image.width > 4096 || image.height > 4096 || image.width * image.height > 8000000) throw new Error('Image exceeds 8 megapixels.');
    image.autoOrient(); image.strip();
    const max = kind === 'avatars' ? 512 : 2048;
    if (Math.max(image.width,image.height) > max) image.resize(Math.round(image.width * max / Math.max(image.width,image.height)), Math.round(image.height * max / Math.max(image.width,image.height)));
    image.quality = 85;
    return image.write(MagickFormat.Jpeg, output => {
      if (output.length > MAX_BYTES) throw new Error('Processed image is too large.');
      return Uint8Array.from(output);
    });
  });
}
