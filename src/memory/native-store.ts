/**
 * Native acceleration bridge for memory storage.
 * Uses Rust canonical store, TurboQuant compressor, and write firewall when available.
 * All functions fall back gracefully if the native module is not loaded.
 */
import { getNative } from '../native/index.js';
import type { NativeCanonicalStore } from '../native/index.js';

/** Get a native persistent canonical store, or null if unavailable. */
export function getNativeCanonicalStore(dbPath: string): NativeCanonicalStore | null {
  const native = getNative();
  if (!native) return null;
  try {
    return native.JsCanonicalStore.open(dbPath);
  } catch {
    return null;
  }
}

/** Get an in-memory native canonical store for testing, or null if unavailable. */
export function getNativeCanonicalStoreInMemory(): NativeCanonicalStore | null {
  const native = getNative();
  if (!native) return null;
  try {
    return native.JsCanonicalStore.inMemory();
  } catch {
    return null;
  }
}

export interface CompressionResult {
  compressed: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Compress a float32 vector using the native TurboQuant compressor.
 * Returns null if native is unavailable.
 */
export function compressVector(
  vector: Float32Array,
  bits: number = 8
): CompressionResult | null {
  const native = getNative();
  if (!native) return null;
  try {
    const compressor = new native.JsTurboCompressor(vector.length, bits);
    const compressed = compressor.compress(vector);
    return {
      compressed,
      originalSize: vector.length * 4,
      compressedSize: compressed.length,
    };
  } catch {
    return null;
  }
}

/**
 * Evaluate a write request through the native security firewall.
 * Fails-open (returns allowed:true) if native is unavailable.
 */
export function evaluateWriteSecurity(
  namespace: string,
  content: string,
  allowedNamespaces: string[]
): { allowed: boolean; reason?: string } {
  const native = getNative();
  if (!native) return { allowed: true };
  try {
    const firewall = new native.JsWriteFirewall(
      JSON.stringify({ allowed_namespaces: allowedNamespaces })
    );
    const result = JSON.parse(
      firewall.evaluate(JSON.stringify({ namespace, content, trust_level: 'agent' }))
    ) as { allowed: boolean; reason?: string };
    return result;
  } catch {
    return { allowed: true };
  }
}
