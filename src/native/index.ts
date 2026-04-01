/**
 * Native module loader with graceful fallback.
 * Attempts to load the napi-rs compiled .node addon.
 * Falls back gracefully if unavailable (no Rust toolchain, wrong platform, etc.).
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ─── Types matching FFI exports from lib.rs ───────────────────────────────────

export interface NativeWallet {
  address(): string;
  signMessage(msg: Buffer): string;
}
export interface NativeWalletConstructor {
  generate(): NativeWallet;
  fromPrivateKey(hex: string): NativeWallet;
}

export interface NativeFeeSchedule {
  calculate(amount: number, decimals: number, feeType: string): string;
}
export interface NativeFeeScheduleConstructor {
  withDefaults(): NativeFeeSchedule;
  new(txBps: number, swapBps: number, recipientHex: string): NativeFeeSchedule;
}

export interface NativeX402Client {
  createPaymentHeader(paymentJson: string, signature: string): string;
}
export interface NativeX402ClientConstructor {
  new(): NativeX402Client;
}

export interface NativeCanonicalStore {
  insert(recordJson: string): string;
  get(id: string): string | null;
  verifyIntegrity(id: string): boolean;
}
export interface NativeCanonicalStoreConstructor {
  open(path: string): NativeCanonicalStore;
  inMemory(): NativeCanonicalStore;
}

export interface NativeTurboCompressor {
  compress(vector: Float32Array): string;
  decompress(compressedJson: string): Float32Array;
}
export interface NativeTurboCompressorConstructor {
  new(dimensions: number, bits: number): NativeTurboCompressor;
}

export interface NativeWriteFirewall {
  evaluate(requestJson: string): string;
}
export interface NativeWriteFirewallConstructor {
  new(configJson: string): NativeWriteFirewall;
}

export interface NativeModule {
  JsAgentWallet: NativeWalletConstructor;
  JsFeeSchedule: NativeFeeScheduleConstructor;
  JsX402Client: NativeX402ClientConstructor;
  JsCanonicalStore: NativeCanonicalStoreConstructor;
  JsTurboCompressor: NativeTurboCompressorConstructor;
  JsWriteFirewall: NativeWriteFirewallConstructor;
}

// ─── Loader ──────────────────────────────────────────────────────────────────

let _native: NativeModule | null = null;
let _attempted = false;

function tryLoad(): NativeModule | null {
  if (_attempted) return _native;
  _attempted = true;

  // Candidate paths — resolved relative to the compiled output location
  const candidates = [
    join(__dirname, '../../native/ffi/index.node'),
    join(__dirname, '../../native/ffi/clawpowers_ffi.node'),
    join(__dirname, '../../../native/ffi/index.node'),
    join(__dirname, '../../../native/ffi/clawpowers_ffi.node'),
    // Also try relative to source (for tsx/ts-node development)
    join(__dirname, '../native/ffi/index.node'),
    join(__dirname, '../native/ffi/clawpowers_ffi.node'),
  ];

  for (const p of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _native = require(p) as NativeModule;
      console.log(`[clawpowers] Native acceleration enabled (${p})`);
      return _native;
    } catch {
      // Continue
    }
  }

  console.log('[clawpowers] Native acceleration unavailable — TypeScript fallback active');
  return null;
}

/**
 * Get the native module, or null if unavailable.
 */
export function getNative(): NativeModule | null {
  return tryLoad();
}

/**
 * Returns true if the native Rust addon was loaded successfully.
 */
export function isNativeAvailable(): boolean {
  return tryLoad() !== null;
}
