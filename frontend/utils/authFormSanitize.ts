/** Strip accidental leading/trailing whitespace (common on mobile keyboards). */

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function trimAuthPassword(password: string): string {
  return password.trim();
}

export function trimAuthText(value: string): string {
  return value.trim();
}

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}

export type RegisterFormFields = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  country: string;
};

export function sanitizeRegisterForm(data: RegisterFormFields): RegisterFormFields {
  return {
    firstName: trimAuthText(data.firstName),
    lastName: trimAuthText(data.lastName),
    email: normalizeAuthEmail(data.email),
    password: trimAuthPassword(data.password),
    confirmPassword: trimAuthPassword(data.confirmPassword),
    phone: trimAuthText(data.phone),
    country: trimAuthText(data.country) || 'Pakistan',
  };
}

export function trimAuthFieldByName(name: string, value: string): string {
  switch (name) {
    case 'email':
      return normalizeAuthEmail(value);
    case 'password':
    case 'confirmPassword':
    case 'newPassword':
      return trimAuthPassword(value);
    default:
      return trimAuthText(value);
  }
}
