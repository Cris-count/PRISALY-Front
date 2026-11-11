import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

// Client-side checks mirroring backend constraints. The server stays the authority.

// M3 compares the canonical lower-case UUID spelling.
export const uuidValidator: ValidatorFn = Validators.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
export const positiveIntValidator: ValidatorFn = Validators.pattern(/^[1-9]\d*$/);
export const nonNegativeIntValidator: ValidatorFn = Validators.pattern(/^\d+$/);
export const eightDigitsValidator: ValidatorFn = Validators.pattern(/^\d{8}$/);

// Group validator: "fin" must be later than "inicio" (datetime-local values).
export const dateRangeValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const inicio = localToIso(String(group.get('inicio')?.value ?? ''));
  const fin = localToIso(String(group.get('fin')?.value ?? ''));
  return inicio !== null && fin !== null && fin <= inicio ? { rangoFechas: true } : null;
};

// Message for a control, shown once it was touched or the form was submitted.
export function fieldError(control: AbstractControl, label: string, formatHint: string, submitted: boolean): string | null {
  if (control.valid || !(control.touched || submitted)) {
    return null;
  }
  const errors = control.errors ?? {};
  if (errors['required']) {
    return `Campo obligatorio: ${label.toLowerCase()}.`;
  }
  if (errors['email']) {
    return 'Introduce un correo válido.';
  }
  if (errors['maxlength']) {
    return `${label}: máximo ${(errors['maxlength'] as { requiredLength: number }).requiredLength} caracteres.`;
  }
  return `${label}: ${formatHint}`;
}

// <input type="datetime-local"> value (local time) to an ISO-8601 instant.
export function localToIso(value: string): string | null {
  if (value.length === 0) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isoToLocal(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function blankToNull(value: string): string | null {
  return value.trim().length > 0 ? value : null;
}

export function newUuid(): string {
  return crypto.randomUUID();
}
