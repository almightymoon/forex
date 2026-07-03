export type ForexMarketId = 'sydney' | 'tokyo' | 'london' | 'newYork';

export type VolumeLevel = 'high' | 'medium' | 'low' | 'closed';

export type ForexMarket = {
  id: ForexMarketId;
  label: string;
  flag: string;
  timeZone: string;
  /** Session open hour in UTC (0–24, may wrap past midnight). */
  openUtc: number;
  /** Session close hour in UTC (0–24). */
  closeUtc: number;
};

export type ForexMarketStatus = ForexMarket & {
  isOpen: boolean;
  localTime: string;
  segments: Array<{ left: number; width: number }>;
};

export type MarketClockSnapshot = {
  deviceTimeZone: string;
  clock: string;
  utcFraction: number;
  marketsClosed: boolean;
  sessions: ForexMarketStatus[];
  volume: VolumeLevel;
  volumeNote: string;
  openLabels: string[];
};

const MARKETS: ForexMarket[] = [
  { id: 'sydney', label: 'Sydney', flag: '🇦🇺', timeZone: 'Australia/Sydney', openUtc: 22, closeUtc: 7 },
  { id: 'tokyo', label: 'Tokyo', flag: '🇯🇵', timeZone: 'Asia/Tokyo', openUtc: 0, closeUtc: 9 },
  { id: 'london', label: 'London', flag: '🇬🇧', timeZone: 'Europe/London', openUtc: 8, closeUtc: 17 },
  { id: 'newYork', label: 'New York', flag: '🇺🇸', timeZone: 'America/New_York', openUtc: 13, closeUtc: 22 },
];

function utcHour(now: Date) {
  return now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
}

export function isForexWeekendClosed(now: Date) {
  const day = now.getUTCDay();
  const h = utcHour(now);
  if (day === 6) return true;
  if (day === 0 && h < 22) return true;
  return false;
}

export function isSessionOpen(now: Date, openUtc: number, closeUtc: number) {
  if (isForexWeekendClosed(now)) return false;
  const h = utcHour(now);
  if (openUtc < closeUtc) return h >= openUtc && h < closeUtc;
  return h >= openUtc || h < closeUtc;
}

export function sessionSegments(openUtc: number, closeUtc: number): Array<{ left: number; width: number }> {
  if (openUtc < closeUtc) {
    return [{ left: openUtc / 24, width: (closeUtc - openUtc) / 24 }];
  }
  return [
    { left: openUtc / 24, width: (24 - openUtc) / 24 },
    { left: 0, width: closeUtc / 24 },
  ];
}

function formatLocalTime(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);
}

function formatDeviceClock(now: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

function getDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function volumeFor(now: Date, openSessions: ForexMarketStatus[]): Pick<MarketClockSnapshot, 'volume' | 'volumeNote'> {
  if (isForexWeekendClosed(now)) {
    return { volume: 'closed', volumeNote: 'Markets reopen Sunday evening (UTC)' };
  }

  const h = utcHour(now);
  const openNames = openSessions.map((s) => s.label);
  const hasLondon = openSessions.some((s) => s.id === 'london');
  const hasNewYork = openSessions.some((s) => s.id === 'newYork');

  if (hasLondon && hasNewYork) {
    return { volume: 'high', volumeNote: 'London + New York overlap' };
  }
  if (hasLondon || hasNewYork) {
    return {
      volume: 'medium',
      volumeNote: hasLondon ? 'London session driving flow' : 'New York session in focus',
    };
  }
  if (openNames.length > 0) {
    return { volume: 'low', volumeNote: `${openNames.join(' + ')} — quieter liquidity` };
  }
  if (h >= 17 && h < 22) {
    return { volume: 'low', volumeNote: 'Between major sessions' };
  }
  return { volume: 'low', volumeNote: 'Asian hours — plan and review' };
}

export function getMarketClockSnapshot(now = new Date()): MarketClockSnapshot {
  const marketsClosed = isForexWeekendClosed(now);
  const sessions: ForexMarketStatus[] = MARKETS.map((market) => ({
    ...market,
    isOpen: isSessionOpen(now, market.openUtc, market.closeUtc),
    localTime: formatLocalTime(now, market.timeZone),
    segments: sessionSegments(market.openUtc, market.closeUtc),
  }));

  const openSessions = sessions.filter((s) => s.isOpen);
  const { volume, volumeNote } = volumeFor(now, openSessions);

  return {
    deviceTimeZone: getDeviceTimeZone(),
    clock: formatDeviceClock(now),
    utcFraction: utcHour(now) / 24,
    marketsClosed,
    sessions,
    volume,
    volumeNote,
    openLabels: openSessions.map((s) => s.label),
  };
}

export const TIMELINE_LABELS = ['12a', '4a', '8a', '12p', '4p', '8p'] as const;
