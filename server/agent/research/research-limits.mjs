export const REPORT_INPUT_BYTES=128000;
export const REPORT_MAX_TOKENS=5000;
// Keep capacity for the bounded report request before optional evidence calls.
// The actual model request still requires its own price quote and reservation.
export const REPORT_CLOSING_MICROS=320000;
export const REPORT_CLOSING_TIME_MS=45000;
export const isResearchEvidenceStep=key=>/^(?:local-evidence(?:$|:)|hybrid-evidence:|web:)/.test(key);
export const evidenceTimeAvailable=budget=>Math.max(0,budget.remainingTimeMs-REPORT_CLOSING_TIME_MS);
