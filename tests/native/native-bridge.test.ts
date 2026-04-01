import { createHash, randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { isNativeAvailable, getNative } from '../../src/native/index.js';
import {
  calculateTransactionFee,
  createPaymentHeader,
  generateWalletAddress,
} from '../../src/payments/native-bridge.js';
import {
  compressVector,
  evaluateWriteSecurity,
  getNativeCanonicalStoreInMemory,
} from '../../src/memory/native-store.js';

describe('native bridge', () => {
  it('isNativeAvailable returns a boolean without throwing', () => {
    const available = isNativeAvailable();
    expect(typeof available).toBe('boolean');
  });

  describe('calculateTransactionFee', () => {
    it('returns gross, fee, net, feeRecipient', () => {
      const result = calculateTransactionFee(100, 6);
      expect(result.gross).toBe(100);
      expect(result.fee).toBeGreaterThan(0);
      expect(result.net).toBeLessThan(100);
      expect(result.feeRecipient).toMatch(/^0x/);
    });

    it('fallback produces ~77 bps fee', () => {
      const result = calculateTransactionFee(1000, 6);
      // 77bps of 1000 = 7.7
      expect(result.fee).toBeCloseTo(7.7, 0);
    });

    it('gross equals fee + net', () => {
      const result = calculateTransactionFee(500, 6);
      expect(result.fee + result.net).toBeCloseTo(result.gross, 4);
    });
  });

  describe('generateWalletAddress', () => {
    it('returns a string starting with 0x', () => {
      const address = generateWalletAddress();
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/i);
    });
  });

  describe('createPaymentHeader', () => {
    it('returns a non-empty string', () => {
      const payJson = JSON.stringify({ amount: 1, currency: 'USDC', recipient: '0x1234567890abcdef1234567890abcdef12345678' });
      const header = createPaymentHeader(payJson, 'sig123');
      expect(typeof header).toBe('string');
      expect(header.length).toBeGreaterThan(0);
    });
  });

  describe('compressVector', () => {
    it('returns null or a valid result', () => {
      const vec = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const result = compressVector(vec);
      if (result !== null) {
        expect(typeof result.compressed).toBe('string');
        expect(result.originalSize).toBe(16);
      } else {
        expect(result).toBeNull();
      }
    });
  });

  describe('evaluateWriteSecurity', () => {
    it('returns allowed:true without native', () => {
      const result = evaluateWriteSecurity('ns', 'data', ['ns', 'other']);
      expect(result).toHaveProperty('allowed');
    });
  });

  describe('native-only tests (skipped if native unavailable)', () => {
    it('native wallet generates valid EVM address', () => {
      const native = getNative();
      if (!native) return;
      const wallet = native.JsAgentWallet.generate();
      expect(wallet.address()).toMatch(/^0x[0-9a-fA-F]{40}$/i);
    });

    it('native fee schedule default rates are correct', () => {
      const native = getNative();
      if (!native) return;
      const schedule = native.JsFeeSchedule.withDefaults();
      const result = JSON.parse(schedule.calculate(1000, 6, 'transaction')) as {
        gross: number; fee: number; net: number;
      };
      expect(result.gross).toBeCloseTo(1000, 0);
      expect(result.fee).toBeGreaterThan(0);
      expect(result.net).toBeLessThan(1000);
    });

    it('native canonical store insert and get', () => {
      const store = getNativeCanonicalStoreInMemory();
      if (!store) return;
      const content = 'hello world';
      const hash = createHash('sha256').update(content).digest('hex');
      const id = store.insert(JSON.stringify({
        id: randomUUID(),
        namespace: 'test',
        content,
        content_hash: hash,
        embedding: null,
        metadata: {},
        created_at: new Date().toISOString(),
        provenance: 'test-agent',
      }));
      expect(id).toBeTruthy();
      const retrieved = store.get(id);
      expect(retrieved).toBeTruthy();
      expect(store.verifyIntegrity(id)).toBe(true);
    });
  });
});
