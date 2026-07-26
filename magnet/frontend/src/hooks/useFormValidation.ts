import { useState, useCallback } from 'react';
import { validate, ValidationRules, ValidationErrors, hasErrors } from '../utils/validation';

export function useFormValidation(rules: ValidationRules) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateForm = useCallback((values: Record<string, any>): boolean => {
    const errs = validate(rules, values);
    setErrors(errs);
    return !hasErrors(errs);
  }, [rules]);

  const validateField = useCallback((field: string, value: any, allValues?: Record<string, any>) => {
    const rule = rules[field];
    if (!rule) return;
    const result = validate({ [field]: rule }, allValues || { [field]: value });
    setErrors((prev) => {
      const next = { ...prev };
      if (result[field]) {
        next[field] = result[field];
      } else {
        delete next[field];
      }
      return next;
    });
  }, [rules]);

  const touchField = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const resetErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validateForm,
    validateField,
    touchField,
    resetErrors,
    setErrors,
  };
}
