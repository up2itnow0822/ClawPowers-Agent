/**
 * ITP Delegation Hooks
 *
 * Wraps encode/decode for the agent delegation pipeline.
 * When an agent delegates a task to another agent, these hooks
 * compress the message before sending and decompress on receipt.
 *
 * Graceful fallback — if ITP server is down, messages pass through unchanged.
 */

import { itpEncode, itpDecode } from 'clawpowers';

/**
 * Encode a delegation message before sending to another agent.
 * Adds source/target agent metadata for ITP history tracking.
 *
 * @param msg - The message to encode
 * @param from - Source agent identifier
 * @param to - Target agent identifier
 * @returns The encoded message string (or original if ITP unavailable)
 */
export async function itpEncodeMessage(
  msg: string,
  from: string,
  _to: string,
): Promise<string> {
  try {
    const result = await itpEncode(msg, from);
    return result.encoded;
  } catch {
    // Graceful fallback — return original message
    return msg;
  }
}

/**
 * Decode a received delegation message.
 * If the message is not ITP-encoded, returns it unchanged.
 *
 * @param msg - The message to decode
 * @returns The decoded message string (or original if not ITP or server unavailable)
 */
export async function itpDecodeMessage(msg: string): Promise<string> {
  try {
    const result = await itpDecode(msg);
    return result.decoded;
  } catch {
    // Graceful fallback — return original message
    return msg;
  }
}
