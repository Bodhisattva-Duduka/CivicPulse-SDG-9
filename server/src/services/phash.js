// Perceptual hash (dHash) computation and comparison (§8)
import sharp from 'sharp';

/**
 * Compute a 64-bit difference hash (dHash) from image bytes.
 * Resize to 9×8 grayscale. For each row, compare each pixel to the one to its right;
 * bit = 1 if left pixel is brighter. Returns hex string.
 */
export const computeDHash = async (imageBuffer) => {
  // Resize to 9 wide × 8 tall, grayscale
  const { data } = await sharp(imageBuffer)
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = BigInt(0);
  let bit = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const leftPixel = data[row * 9 + col];
      const rightPixel = data[row * 9 + col + 1];
      if (leftPixel > rightPixel) {
        hash |= BigInt(1) << BigInt(bit);
      }
      bit++;
    }
  }

  // Convert to 16-char hex string
  return hash.toString(16).padStart(16, '0');
};

/**
 * Compute Hamming distance between two hex hash strings.
 * Returns number of differing bits (0–64).
 */
export const hammingDistance = (hash1, hash2) => {
  const h1 = BigInt('0x' + hash1);
  const h2 = BigInt('0x' + hash2);
  let xor = h1 ^ h2;
  let count = 0;

  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }

  return count;
};

/**
 * Fetch image from URL and compute dHash
 */
export const computeDHashFromUrl = async (imageUrl) => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return computeDHash(buffer);
};
