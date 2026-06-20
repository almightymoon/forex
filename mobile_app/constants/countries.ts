export type Country = {
  iso: string;
  name: string;
  dial: string;
};

/** ISO → flag emoji */
export function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export const COUNTRIES: Country[] = [
  { iso: 'US', name: 'United States', dial: '1' },
  { iso: 'CA', name: 'Canada', dial: '1' },
  { iso: 'GB', name: 'United Kingdom', dial: '44' },
  { iso: 'AU', name: 'Australia', dial: '61' },
  { iso: 'DE', name: 'Germany', dial: '49' },
  { iso: 'FR', name: 'France', dial: '33' },
  { iso: 'IN', name: 'India', dial: '91' },
  { iso: 'PK', name: 'Pakistan', dial: '92' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966' },
  { iso: 'NG', name: 'Nigeria', dial: '234' },
  { iso: 'ZA', name: 'South Africa', dial: '27' },
  { iso: 'KE', name: 'Kenya', dial: '254' },
  { iso: 'GH', name: 'Ghana', dial: '233' },
  { iso: 'EG', name: 'Egypt', dial: '20' },
  { iso: 'BR', name: 'Brazil', dial: '55' },
  { iso: 'MX', name: 'Mexico', dial: '52' },
  { iso: 'AR', name: 'Argentina', dial: '54' },
  { iso: 'CO', name: 'Colombia', dial: '57' },
  { iso: 'CL', name: 'Chile', dial: '56' },
  { iso: 'ES', name: 'Spain', dial: '34' },
  { iso: 'IT', name: 'Italy', dial: '39' },
  { iso: 'NL', name: 'Netherlands', dial: '31' },
  { iso: 'BE', name: 'Belgium', dial: '32' },
  { iso: 'CH', name: 'Switzerland', dial: '41' },
  { iso: 'SE', name: 'Sweden', dial: '46' },
  { iso: 'NO', name: 'Norway', dial: '47' },
  { iso: 'DK', name: 'Denmark', dial: '45' },
  { iso: 'FI', name: 'Finland', dial: '358' },
  { iso: 'PL', name: 'Poland', dial: '48' },
  { iso: 'PT', name: 'Portugal', dial: '351' },
  { iso: 'IE', name: 'Ireland', dial: '353' },
  { iso: 'AT', name: 'Austria', dial: '43' },
  { iso: 'GR', name: 'Greece', dial: '30' },
  { iso: 'TR', name: 'Turkey', dial: '90' },
  { iso: 'RU', name: 'Russia', dial: '7' },
  { iso: 'UA', name: 'Ukraine', dial: '380' },
  { iso: 'CN', name: 'China', dial: '86' },
  { iso: 'JP', name: 'Japan', dial: '81' },
  { iso: 'KR', name: 'South Korea', dial: '82' },
  { iso: 'SG', name: 'Singapore', dial: '65' },
  { iso: 'MY', name: 'Malaysia', dial: '60' },
  { iso: 'ID', name: 'Indonesia', dial: '62' },
  { iso: 'PH', name: 'Philippines', dial: '63' },
  { iso: 'TH', name: 'Thailand', dial: '66' },
  { iso: 'VN', name: 'Vietnam', dial: '84' },
  { iso: 'BD', name: 'Bangladesh', dial: '880' },
  { iso: 'LK', name: 'Sri Lanka', dial: '94' },
  { iso: 'NP', name: 'Nepal', dial: '977' },
  { iso: 'NZ', name: 'New Zealand', dial: '64' },
  { iso: 'IL', name: 'Israel', dial: '972' },
  { iso: 'QA', name: 'Qatar', dial: '974' },
  { iso: 'KW', name: 'Kuwait', dial: '965' },
  { iso: 'BH', name: 'Bahrain', dial: '973' },
  { iso: 'OM', name: 'Oman', dial: '968' },
  { iso: 'JO', name: 'Jordan', dial: '962' },
  { iso: 'LB', name: 'Lebanon', dial: '961' },
  { iso: 'IQ', name: 'Iraq', dial: '964' },
  { iso: 'IR', name: 'Iran', dial: '98' },
  { iso: 'MA', name: 'Morocco', dial: '212' },
  { iso: 'TN', name: 'Tunisia', dial: '216' },
  { iso: 'DZ', name: 'Algeria', dial: '213' },
  { iso: 'ET', name: 'Ethiopia', dial: '251' },
  { iso: 'TZ', name: 'Tanzania', dial: '255' },
  { iso: 'UG', name: 'Uganda', dial: '256' },
  { iso: 'RW', name: 'Rwanda', dial: '250' },
  { iso: 'CM', name: 'Cameroon', dial: '237' },
  { iso: 'CI', name: 'Ivory Coast', dial: '225' },
  { iso: 'SN', name: 'Senegal', dial: '221' },
  { iso: 'JM', name: 'Jamaica', dial: '1876' },
  { iso: 'TT', name: 'Trinidad and Tobago', dial: '1868' },
  { iso: 'BB', name: 'Barbados', dial: '1246' },
  { iso: 'BS', name: 'Bahamas', dial: '1242' },
  { iso: 'DO', name: 'Dominican Republic', dial: '1809' },
  { iso: 'PR', name: 'Puerto Rico', dial: '1787' },
  { iso: 'HK', name: 'Hong Kong', dial: '852' },
  { iso: 'TW', name: 'Taiwan', dial: '886' },
  { iso: 'MO', name: 'Macau', dial: '853' },
  { iso: 'CZ', name: 'Czech Republic', dial: '420' },
  { iso: 'HU', name: 'Hungary', dial: '36' },
  { iso: 'RO', name: 'Romania', dial: '40' },
  { iso: 'BG', name: 'Bulgaria', dial: '359' },
  { iso: 'HR', name: 'Croatia', dial: '385' },
  { iso: 'RS', name: 'Serbia', dial: '381' },
  { iso: 'SK', name: 'Slovakia', dial: '421' },
  { iso: 'SI', name: 'Slovenia', dial: '386' },
  { iso: 'LT', name: 'Lithuania', dial: '370' },
  { iso: 'LV', name: 'Latvia', dial: '371' },
  { iso: 'EE', name: 'Estonia', dial: '372' },
  { iso: 'IS', name: 'Iceland', dial: '354' },
  { iso: 'LU', name: 'Luxembourg', dial: '352' },
  { iso: 'MT', name: 'Malta', dial: '356' },
  { iso: 'CY', name: 'Cyprus', dial: '357' },
  { iso: 'KZ', name: 'Kazakhstan', dial: '7' },
  { iso: 'UZ', name: 'Uzbekistan', dial: '998' },
  { iso: 'GE', name: 'Georgia', dial: '995' },
  { iso: 'AM', name: 'Armenia', dial: '374' },
  { iso: 'AZ', name: 'Azerbaijan', dial: '994' },
  { iso: 'PE', name: 'Peru', dial: '51' },
  { iso: 'VE', name: 'Venezuela', dial: '58' },
  { iso: 'EC', name: 'Ecuador', dial: '593' },
  { iso: 'UY', name: 'Uruguay', dial: '598' },
  { iso: 'PY', name: 'Paraguay', dial: '595' },
  { iso: 'BO', name: 'Bolivia', dial: '591' },
  { iso: 'CR', name: 'Costa Rica', dial: '506' },
  { iso: 'PA', name: 'Panama', dial: '507' },
  { iso: 'GT', name: 'Guatemala', dial: '502' },
  { iso: 'HN', name: 'Honduras', dial: '504' },
  { iso: 'SV', name: 'El Salvador', dial: '503' },
  { iso: 'NI', name: 'Nicaragua', dial: '505' },
  { iso: 'CU', name: 'Cuba', dial: '53' },
  { iso: 'HT', name: 'Haiti', dial: '509' },
];

/** Longest dial codes first so +1868 matches before +1 */
export const COUNTRIES_BY_DIAL = [...COUNTRIES].sort(
  (a, b) => b.dial.length - a.dial.length || a.name.localeCompare(b.name),
);

export function getDefaultCountry(): Country {
  return COUNTRIES.find((c) => c.iso === 'CA') ?? COUNTRIES[0];
}

export function findCountryFromPhone(phone: string): Country | null {
  const normalized = phone.replace(/[\s()-]/g, '');
  if (!normalized.startsWith('+')) return null;

  const digits = normalized.slice(1);
  for (const country of COUNTRIES_BY_DIAL) {
    if (digits.startsWith(country.dial)) return country;
  }
  return null;
}

export function formatPhoneForSubmit(phone: string, country: Country): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('+')) {
    return trimmed.replace(/[\s()-]/g, '');
  }

  const digits = trimmed.replace(/\D/g, '');
  return digits ? `+${country.dial}${digits}` : '';
}

export function stripDialCode(phone: string, country: Country): string {
  const normalized = phone.replace(/[\s()-]/g, '');
  if (!normalized.startsWith('+')) return phone;

  const digits = normalized.slice(1);
  if (digits.startsWith(country.dial)) {
    return digits.slice(country.dial.length);
  }
  return phone;
}
