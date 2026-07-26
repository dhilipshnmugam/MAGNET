export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
  email?: boolean;
  match?: string;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface ValidationErrors {
  [field: string]: string;
}

export function validate(rules: ValidationRules, values: Record<string, any>): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = values[field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
      continue;
    }

    if (value === undefined || value === null || value === '') continue;

    if (rule.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors[field] = 'Please enter a valid email address.';
        continue;
      }
    }

    if (rule.minLength !== undefined && String(value).length < rule.minLength) {
      errors[field] = `Must be at least ${rule.minLength} characters.`;
      continue;
    }

    if (rule.maxLength !== undefined && String(value).length > rule.maxLength) {
      errors[field] = `Must be at most ${rule.maxLength} characters.`;
      continue;
    }

    if (rule.min !== undefined && Number(value) < rule.min) {
      errors[field] = `Must be at least ${rule.min}.`;
      continue;
    }

    if (rule.max !== undefined && Number(value) > rule.max) {
      errors[field] = `Must be at most ${rule.max}.`;
      continue;
    }

    if (rule.pattern && !rule.pattern.test(String(value))) {
      errors[field] = rule.patternMessage || 'Invalid format.';
      continue;
    }

    if (rule.match !== undefined && value !== values[rule.match]) {
      errors[field] = `Must match ${rule.match}.`;
      continue;
    }

    if (rule.custom) {
      const msg = rule.custom(value);
      if (msg) {
        errors[field] = msg;
      }
    }
  }

  return errors;
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function getFirstError(errors: ValidationErrors): string | null {
  const keys = Object.keys(errors);
  return keys.length > 0 ? errors[keys[0]] : null;
}

export const validators = {
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  password: (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value),
  phone: (value: string) => /^[+]?[\d\s-]{7,15}$/.test(value),
  alphanumeric: (value: string) => /^[a-zA-Z0-9]+$/.test(value),
  url: (value: string) => {
    try { new URL(value); return true; } catch { return false; }
  },
};
