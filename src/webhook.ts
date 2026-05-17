import * as crypto from 'crypto';
import { WebhookPayload, WebhookData, ParsedWebhookData } from './types';
import { TMWeasyValidationError, TMWeasySignatureError } from './errors';

/**
 * Utility class to verify and parse TMWeasy PromptPay Webhook data
 */
export class TMWeasyWebhook {
  /**
   * Calculate MD5 signature for the given raw data string and API Key
   * @param rawData The raw JSON data string sent from TMWeasy webhook ('data' parameter)
   * @param apiKey Your TMWeasy API Key
   * @returns Calculated MD5 hash in lowercase hex
   */
  public static calculateSignature(rawData: string, apiKey: string): string {
    if (!rawData || typeof rawData !== 'string') {
      throw new TMWeasyValidationError('Raw data string is required to calculate signature', 'rawData');
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      throw new TMWeasyValidationError('API key is required to calculate signature', 'apiKey');
    }

    return crypto
      .createHash('md5')
      .update(`${rawData}:${apiKey.trim()}`)
      .digest('hex')
      .toLowerCase();
  }

  /**
   * Verify if the signature sent in the webhook payload is valid
   * @param rawData The raw JSON data string sent from TMWeasy webhook ('data' parameter)
   * @param signature The MD5 signature sent from TMWeasy webhook ('signature' parameter)
   * @param apiKey Your TMWeasy API Key
   * @returns True if the signature is valid, false otherwise
   */
  public static verifySignature(rawData: string, signature: string, apiKey: string): boolean {
    if (!signature || typeof signature !== 'string') {
      return false;
    }

    try {
      const calculated = this.calculateSignature(rawData, apiKey);
      return calculated === signature.trim().toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Verify signature and parse the webhook data.
   * 
   * > [!IMPORTANT]
   * > In web frameworks like Express, if you use JSON parsers (e.g. `express.json()`), the `req.body.data` might be parsed into an object.
   * > Because object serialization can change key ordering and spacing, validating signature with `JSON.stringify(obj)` might fail.
   * > We highly recommend obtaining the raw request body string whenever possible.
   * 
   * @param payload Webhook POST payload containing `data` and `signature`
   * @param apiKey Your TMWeasy API Key
   * @returns Verified and parsed webhook data with added helpers (e.g. `amount_baht`)
   */
  public static verifyAndParse(payload: WebhookPayload, apiKey: string): ParsedWebhookData {
    if (!payload || !payload.data || !payload.signature) {
      throw new TMWeasyValidationError('Invalid webhook payload: data and signature are required', 'payload');
    }

    const { data, signature } = payload;
    let rawDataString = '';
    let parsedData: WebhookData;

    // Check if data is already an object (due to framework parsing) or a string
    if (typeof data === 'string') {
      rawDataString = data;
      try {
        parsedData = JSON.parse(data) as WebhookData;
      } catch (parseError) {
        throw new TMWeasyValidationError('Webhook "data" string is not a valid JSON', 'data');
      }
    } else if (typeof data === 'object' && data !== null) {
      // Handle cases where middleware has already parsed the data field into an object
      parsedData = data as WebhookData;
      rawDataString = JSON.stringify(data);
    } else {
      throw new TMWeasyValidationError('Webhook "data" parameter must be a JSON string or a parsed object', 'data');
    }

    // 1. Verify Signature
    const isValid = this.verifySignature(rawDataString, signature, apiKey);
    if (!isValid) {
      // If we used JSON.stringify on an object, the order might be different. 
      // Try sorting keys as a secondary fallback attempt to be developer-friendly.
      let secondaryValid = false;
      if (typeof data !== 'string') {
        try {
          const sortedData = this.sortObjectKeys(parsedData as unknown as Record<string, unknown>);
          const sortedString = JSON.stringify(sortedData);
          secondaryValid = this.verifySignature(sortedString, signature, apiKey);
        } catch {
          // Ignore secondary check errors and fail
        }
      }

      if (!secondaryValid) {
        throw new TMWeasySignatureError('Webhook signature verification failed. Request is untrusted.');
      }
    }

    // 2. Validate fields inside parsed data
    if (!parsedData.id_pay || !parsedData.ref1 || !parsedData.amount_check || !parsedData.amount) {
      throw new TMWeasyValidationError('Invalid payment data: missing required fields', 'data');
    }

    // 3. Add convenience helpers (like converting Satang to Baht)
    const amountCheckSatang = Number(parsedData.amount_check);
    const amountBaht = !isNaN(amountCheckSatang) ? amountCheckSatang / 100 : parseFloat(parsedData.amount);

    return {
      ...parsedData,
      amount_baht: isNaN(amountBaht) ? 0 : amountBaht
    };
  }

  /**
   * Helper to sort keys of an object to ensure deterministic stringification
   */
  private static sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const sorted: Record<string, unknown> = {};
    Object.keys(obj).sort().forEach((key) => {
      sorted[key] = obj[key];
    });
    return sorted;
  }
}
