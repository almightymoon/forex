import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BarChart3,
  BookOpen,
  FileText,
  Library,
  LineChart,
  Play,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';

export type StudentTabId =
  | 'overview'
  | 'courses'
  | 'browse'
  | 'live-sessions'
  | 'signals'
  | 'tradingview'
  | 'assignments'
  | 'community'
  | 'library'
  | 'certificates'
  | 'rank-rewards';

export type StudentNavItem = {
  id: StudentTabId;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export type StudentNavGroup = {
  id: string;
  label: string;
  items: StudentNavItem[];
};

export const STUDENT_NAV_GROUPS: StudentNavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'overview', label: 'Dashboard', icon: BarChart3, description: 'Your trading desk snapshot' },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    items: [
      { id: 'courses', label: 'My courses', icon: BookOpen, description: 'Enrolled curriculum' },
      { id: 'browse', label: 'Browse courses', icon: TrendingUp, description: 'Discover new content' },
      { id: 'assignments', label: 'Assignments', icon: FileText, description: 'Tasks & submissions' },
      { id: 'library', label: 'Library', icon: Library, description: 'Resources & downloads' },
      { id: 'certificates', label: 'Certificates', icon: Award, description: 'Earned credentials' },
    ],
  },
  {
    id: 'trade',
    label: 'Trade',
    items: [
      { id: 'signals', label: 'Trading signals', icon: Target, description: 'Live market ideas' },
      { id: 'tradingview', label: 'TradingView', icon: LineChart, description: 'Charts & positions' },
      { id: 'rank-rewards', label: 'Rank rewards', icon: Trophy, description: 'Referral milestones' },
    ],
  },
  {
    id: 'connect',
    label: 'Connect',
    items: [
      { id: 'live-sessions', label: 'Live sessions', icon: Play, description: 'Classes & webinars' },
      { id: 'community', label: 'Community', icon: Users, description: 'Channels & discussion' },
    ],
  },
];

export const STUDENT_TAB_IDS: StudentTabId[] = STUDENT_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));

export function isStudentTabId(value: string | null | undefined): value is StudentTabId {
  return Boolean(value && STUDENT_TAB_IDS.includes(value as StudentTabId));
}

export function getStudentNavItem(tabId: StudentTabId): StudentNavItem | undefined {
  for (const group of STUDENT_NAV_GROUPS) {
    const item = group.items.find((i) => i.id === tabId);
    if (item) return item;
  }
  return undefined;
}

export function getStudentNavGroup(tabId: StudentTabId): StudentNavGroup | undefined {
  return STUDENT_NAV_GROUPS.find((group) => group.items.some((item) => item.id === tabId));
}
