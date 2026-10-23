export type PhoneCountry = 'AU' | 'IN';
export const PHONE_COUNTRIES = {
  AU: { name: 'Australia', dialCode: '+61', length: 9 },
  IN: { name: 'India', dialCode: '+91', length: 10 },
} as const;

export function cleanMobile(value: string, country: PhoneCountry) {
  let digits = value.replace(/\D/g, '');
  const config = PHONE_COUNTRIES[country];
  const prefix = config.dialCode.slice(1);
  if (digits.startsWith(prefix) && (value.trim().startsWith('+') || digits.length === config.length + prefix.length)) {
    digits = digits.slice(prefix.length);
  }
  return digits.replace(/^0/, '').slice(0, config.length);
}

export function isValidMobile(digits: string, country: PhoneCountry) {
  return country === 'IN' ? /^[6-9]\d{9}$/.test(digits) : /^4\d{8}$/.test(digits);
}

export function toInternationalPhone(digits: string, country: PhoneCountry) {
  return PHONE_COUNTRIES[country].dialCode + digits;
}

/** Existing nine-digit Australian profiles remain readable. */
export function normalizeProfileMobile(value: string) {
  const digits = value.replace(/\D/g, '');
  if (/^\+61/.test(value.trim()) && /^614\d{8}$/.test(digits)) return '+' + digits;
  if (/^\+91/.test(value.trim()) && /^91[6-9]\d{9}$/.test(digits)) return '+' + digits;
  if (/^4\d{8}$/.test(digits)) return '+61' + digits;
  return '';
}
