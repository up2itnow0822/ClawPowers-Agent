/**
 * Native acceleration bridge for payments.
 * Uses Rust wallet/fee/x402 crates when available.
 * All functions fall back gracefully if native module is not loaded.
 */
import { getNative } from '../native/index.js';

export interface FeeCalculation {
  gross: number;
  fee: number;
  net: number;
  feeRecipient: string;
}

/**
 * Calculate transaction fee using the native Rust fee crate (77 bps default).
 * Falls back to a pure-TS 77 bps calculation.
 */
export function calculateTransactionFee(
  amount: number,
  decimals: number = 6
): FeeCalculation {
  const native = getNative();
  if (native) {
    try {
      const schedule = native.JsFeeSchedule.withDefaults();
      const raw = JSON.parse(schedule.calculate(amount, decimals, 'transaction')) as Record<string, unknown>;
      return {
        gross: raw.gross as number,
        fee: raw.fee as number,
        net: raw.net as number,
        feeRecipient: (raw.feeRecipient ?? raw.fee_recipient ?? '0x0000000000000000000000000000000000000000') as string,
      };
    } catch {
      // Fall through to TS fallback
    }
  }
  const fee = amount * 0.0077;
  return { gross: amount, fee, net: amount - fee, feeRecipient: '0x0000000000000000000000000000000000000000' };
}

/**
 * Build an X-Payment header using the native Rust x402 crate.
 * Falls back to a base64-encoded JSON representation.
 */
export function createPaymentHeader(paymentJson: string, signature: string): string {
  const native = getNative();
  if (native) {
    try {
      const client = new native.JsX402Client();
      return client.createPaymentHeader(paymentJson, signature);
    } catch {
      // Fall through
    }
  }
  return Buffer.from(JSON.stringify({ payment: JSON.parse(paymentJson), signature })).toString('base64');
}

/**
 * Generate a new EVM agent wallet address using the native Rust wallet crate.
 * Returns a zero address if native is unavailable.
 */
export function generateWalletAddress(): string {
  const native = getNative();
  if (native) {
    try {
      return native.JsAgentWallet.generate().address();
    } catch {
      // Fall through
    }
  }
  return '0x0000000000000000000000000000000000000000';
}
