export type ValidationSeverity = "error" | "warning" | "suggestion";

export interface ValidationFinding {
  severity: ValidationSeverity;
  field: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationFinding[];
  warnings: ValidationFinding[];
  suggestions: ValidationFinding[];
}
