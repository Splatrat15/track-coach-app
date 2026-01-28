/**
 * Compute a content hash for an image file (used for duplicate detection in OYO).
 * Same image file → same hash. Only used for images, not descriptions.
 */

import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Compute SHA-256 hash of the image file at the given URI.
 * Returns hex string or null if the file cannot be read (e.g. unsupported URI).
 */
export async function computeImageHash(uri: string | undefined): Promise<string | null> {
  if (!uri) {
    console.log('[ImageHash] No URI provided');
    return null;
  }
  try {
    console.log('[ImageHash] Computing hash for URI:', uri.substring(0, 50) + '...');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64 || base64.length === 0) {
      console.warn('[ImageHash] Empty base64 data');
      return null;
    }
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    console.log('[ImageHash] Computed hash:', digest?.substring(0, 16) + '...');
    return digest;
  } catch (error) {
    console.error('[ImageHash] Error computing hash:', error);
    return null;
  }
}
