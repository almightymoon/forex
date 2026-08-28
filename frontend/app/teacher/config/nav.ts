import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BarChart3,
  BookOpen,
  FileText,
  FolderTree,
  Library,
  LineChart,
  MessageSquare,
  Target,
  TrendingUp,
  Users,
  Users2,
  Video,
} from 'lucide-react';

export type TeacherTabId =
  | 'overview'
  | 'students'
  | 'courses'
  | 'assignments'
  | 'live-sessions'
  | 'signals'
  | 'analytics'
  | 'communications'
  | 'community'
  | 'library'
  | 'library-manage'
  | 'landing-progress'
  | 'landing-joiners'
  | 'certificates';

export type TeacherNavItem = {
  id: TeacherTabId;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export type TeacherNavGroup = {
  id: string;
  label: string;
  items: TeacherNavItem[];
};

export const TEACHER_NAV_GROUPS: TeacherNavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'overview', label: 'Dashboard', icon: BarChart3, description: 'Teaching snapshot' },
      { id: 'analytics', label: 'Analytics', icon: TrendingUp, description: 'Performance reports' },
    ],
  },
  {
    id: 'teaching',
    label: 'Teaching',
    items: [
      { id: 'students', label: 'Students', icon: Users, description: 'Roster & progress' },
      { id: 'courses', label: 'Courses', icon: BookOpen, description: 'Curriculum & lessons' },
      { id: 'assignments', label: 'Assignments', icon: FileText, description: 'Grading & tasks' },
      { id: 'live-sessions', label: 'Live sessions', icon: Video, description: 'Scheduled classes' },
      { id: 'certificates', label: 'Certificates', icon: Award, description: 'Awards & templates' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { id: 'library', label: 'Library', icon: Library, description: 'Browse resources' },
      { id: 'library-manage', label: 'Manage library', icon: FolderTree, description: 'Upload & organize' },
      { id: 'landing-progress', label: 'Landing progress', icon: LineChart, description: 'Homepage stats' },
      { id: 'landing-joiners', label: 'Landing joiners', icon: Users2, description: 'New joiners feed' },
    ],
  },
  {
    id: 'engage',
    label: 'Engagement',
    items: [
      { id: 'communications', label: 'Communications', icon: MessageSquare, description: 'Student messages' },
      { id: 'community', label: 'Community', icon: Users, description: 'Groups & forums' },
      { id: 'signals', label: 'Trading signals', icon: Target, description: 'Signal broadcasts' },
    ],
  },
];

export const TEACHER_TAB_IDS: TeacherTabId[] = TEACHER_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));

export function isTeacherTabId(value: string | null | undefined): value is TeacherTabId {
  return Boolean(value && TEACHER_TAB_IDS.includes(value as TeacherTabId));
}

export function getTeacherNavItem(tabId: TeacherTabId): TeacherNavItem | undefined {
  for (const group of TEACHER_NAV_GROUPS) {
    const item = group.items.find((i) => i.id === tabId);
    if (item) return item;
  }
  return undefined;
}

export function getTeacherNavGroup(tabId: TeacherTabId): TeacherNavGroup | undefined {
  return TEACHER_NAV_GROUPS.find((group) => group.items.some((item) => item.id === tabId));
}
