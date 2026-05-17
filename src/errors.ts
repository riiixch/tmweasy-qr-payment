/**
 * Base error class for all TMWeasy-related errors
 */
export class TMWeasyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when client-side validation fails (e.g. invalid amount, invalid promptpay ID)
 */
export class TMWeasyValidationError extends TMWeasyError {
  /** The field that failed validation */
  public readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.field = field;
  }
}

/**
 * Thrown when the TMWeasy API returns a failure response (status: 0) or HTTP error
 */
export class TMWeasyAPIError extends TMWeasyError {
  /** The API response message if available */
  public readonly apiMessage?: string;
  /** The raw body of the API response, if any */
  public readonly responseBody?: unknown;

  constructor(message: string, apiMessage?: string, responseBody?: unknown) {
    super(message);
    this.apiMessage = apiMessage;
    this.responseBody = responseBody;
  }
}

/**
 * Thrown when a webhook request signature verification fails
 */
export class TMWeasySignatureError extends TMWeasyError {
  constructor(message: string) {
    super(message);
  }
}
