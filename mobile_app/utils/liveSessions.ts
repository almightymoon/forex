export type LiveSessionAccess = {
  canView: boolean;
  canReserve: boolean;
  canJoin: boolean;
  canCancel: boolean;
  isBooked: boolean;
  hasPackageAccess: boolean;
  upgradeRequired: boolean;
  packageLabel: string;
  requiredPackages: number[] | null;
};

export type LiveSessionTeacher = {
  firstName?: string;
  lastName?: string;
  profileImage?: string;
};

export type LiveSessionItem = {
  _id: string;
  title: string;
  description?: string;
  teacher?: LiveSessionTeacher;
  scheduledAt: string;
  duration?: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'rescheduled';
  meetingLink?: string;
  recordingUrl?: string;
  maxParticipants?: number;
  currentParticipants?: Array<{ student: { _id?: string } | string }>;
  coverImage?: string;
  access?: LiveSessionAccess;
};

export function parseSessionsResponse(raw: unknown): LiveSessionItem[] {
  if (Array.isArray(raw)) return raw as LiveSessionItem[];
  if (raw && typeof raw === 'object') {
    const obj = raw as { sessions?: LiveSessionItem[]; data?: LiveSessionItem[] };
    if (Array.isArray(obj.sessions)) return obj.sessions;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

export function isUpcomingSession(session: LiveSessionItem) {
  return session.status === 'scheduled' || session.status === 'rescheduled' || session.status === 'live';
}

export function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function formatSessionDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

export function formatSessionTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function getLocalSessionDate(iso: string) {
  const d = new Date(iso);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
  };
}

export function sessionsInMonth(sessions: LiveSessionItem[], year: number, month: number) {
  return sessions.filter((s) => {
    const local = getLocalSessionDate(s.scheduledAt);
    return local.year === year && local.month === month && isUpcomingSession(s);
  });
}

export function sessionDaysSet(sessions: LiveSessionItem[]) {
  const days = new Set<number>();
  sessions.forEach((s) => {
    if (!isUpcomingSession(s)) return;
    days.add(getLocalSessionDate(s.scheduledAt).day);
  });
  return days;
}

/** Monday-first calendar cells for a month (null = leading/trailing padding). */
export function buildMonthGrid(year: number, month: number): Array<number | null> {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function chunkCalendarWeeks(cells: Array<number | null>) {
  const weeks: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function countUserReservations(sessions: LiveSessionItem[]) {
  return sessions.filter((s) => s.access?.isBooked).length;
}
