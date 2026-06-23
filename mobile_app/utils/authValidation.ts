/** Format raw input as MM/DD/YYYY while typing */
export function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatDateToDob(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${month}/${day}/${year}`;
}

export function parseDobToDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]) - 1;
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Latest DOB allowed — user must be 18+ */
export function getMaxDobDate(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - 18);
  return date;
}

export function getDefaultDobPickerDate(value: string): Date {
  return parseDobToDate(value) ?? getMaxDobDate();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function validateEmail(value: string, required = true): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return required ? 'Email is required' : undefined;
  if (!EMAIL_RE.test(trimmed)) return 'Enter a valid email address';
  return undefined;
}

export function validatePassword(value: string, minLength = 6): string | undefined {
  if (!value) return 'Password is required';
  if (value.length < minLength) {
    return `Password must be at least ${minLength} characters`;
  }
  return undefined;
}

export function validateName(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required`;
  if (trimmed.length < 2) return `${label} must be at least 2 characters`;
  if (!/^[\p{L}\s'-]+$/u.test(trimmed)) {
    return `${label} contains invalid characters`;
  }
  return undefined;
}

export function validateDateOfBirth(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return 'Use MM/DD/YYYY format';

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12) return 'Enter a valid month';
  if (year < 1900 || year > new Date().getFullYear()) return 'Enter a valid year';

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return 'Enter a valid date';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return 'Date of birth cannot be in the future';

  let age = today.getFullYear() - year;
  const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
  if (today < birthdayThisYear) age -= 1;

  if (age < 18) return 'You must be at least 18 years old';

  return undefined;
}

/** MM/DD/YYYY → YYYY-MM-DD for API */
export function dobToIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (validateDateOfBirth(trimmed)) return undefined;

  const [, month, day, year] = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)!;
  return `${year}-${month}-${day}`;
}

export function validatePhone(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return 'Enter a valid phone number';
  if (digits.length > 15) return 'Phone number is too long';

  return undefined;
}

export type LoginFieldErrors = {
  email?: string;
  password?: string;
};

export type SignupFieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
};

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, '');
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return undefined;
}

/** Map backend auth/register validation payloads to a single user-facing message. */
export function formatAuthApiError(data: {
  message?: string;
  error?: string;
  details?: Array<{ msg?: string; message?: string } | string>;
}): string {
  if (data.details && Array.isArray(data.details) && data.details.length > 0) {
    const msgs = data.details
      .map((err) => {
        if (typeof err === 'string') return err;
        return err.msg ?? err.message;
      })
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join(', ');
  }
  return data.message ?? data.error ?? 'Something went wrong. Please try again.';
}

export function validateSignupForm(form: {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  password: string;
  confirmPassword: string;
}): SignupFieldErrors {
  return {
    firstName: validateName(form.firstName, 'First name'),
    lastName: validateName(form.lastName, 'Last name'),
    email: validateEmail(form.email),
    dateOfBirth: validateDateOfBirth(form.dateOfBirth),
    phone: validatePhone(form.phone),
    password: validatePassword(form.password),
    confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
  };
}

export function validateLoginForm(email: string, password: string): LoginFieldErrors {
  return {
    email: validateEmail(email),
    password: validatePassword(password),
  };
}

export function hasFieldErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
