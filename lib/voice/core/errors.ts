export type VoiceErrorCode = 
  | 'INVALID_ARGUMENT'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'AMBIGUOUS_REQUEST'
  | 'MISSING_INFORMATION'
  | 'CONFIRMATION_REQUIRED'
  | 'CONFIRMATION_EXPIRED'
  | 'CONFLICT'
  | 'PRICE_CHANGED'
  | 'INSUFFICIENT_INVENTORY'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'WORKFLOW_LIMIT'
  | 'UNKNOWN';

export class VoiceError extends Error {
  public code: VoiceErrorCode;
  public retryable: boolean;
  public userAction?: string;
  public missingFields?: string[];

  constructor(code: VoiceErrorCode, message: string, retryable: boolean = false, userAction?: string, missingFields?: string[]) {
    super(message);
    this.name = 'VoiceError';
    this.code = code;
    this.retryable = retryable;
    this.userAction = userAction;
    this.missingFields = missingFields;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      userAction: this.userAction,
      missingFields: this.missingFields,
    };
  }
}
