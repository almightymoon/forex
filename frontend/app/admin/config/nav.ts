import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BarChart3,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  Library,
  LineChart,
  Mail,
  Megaphone,
  Settings,
  Share2,
  ShoppingBag,
  Target,
  TrendingUp,
  Users,
  Users2,
} from 'lucide-react';

export type AdminTabId =
  | 'overview'
  | 'users'
  | 'payments'
  | 'monthly-fee'
  | 'commissions'
  | 'rank-rewards'
  | 'packages'
  | 'promocodes'
  | 'products'
  | 'library'
  | 'campaigns'
  | 'notifications'
  | 'forms'
  | 'analytics'
  | 'logs'
  | 'landing-progress'
  | 'landing-joiners'
  | 'settings';

export type AdminNavItem = {
  id: AdminTabId;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [{ id: 'overview', label: 'Dashboard', icon: BarChart3, description: 'Platform snapshot' }],
  },
  {
    id: 'people',
    label: 'People',
    items: [{ id: 'users', label: 'Users', icon: Users, description: 'Accounts & access' }],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { id: 'payments', label: 'Payments', icon: DollarSign, description: 'Transactions & withdrawals' },
      { id: 'monthly-fee', label: 'Monthly fee', icon: CreditCard, description: 'Billing cycles' },
      { id: 'commissions', label: 'Commissions', icon: Share2, description: 'Referral payouts' },
      { id: 'rank-rewards', label: 'Rank rewards', icon: Award, description: 'Rank milestones' },
      { id: 'packages', label: 'Packages', icon: CreditCard, description: 'Membership tiers' },
      { id: 'promocodes', label: 'Promo codes', icon: Target, description: 'Discounts' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { id: 'products', label: 'Shop products', icon: ShoppingBag, description: 'Store catalog' },
      { id: 'library', label: 'Library', icon: Library, description: 'Resources & files' },
      { id: 'campaigns', label: 'App campaigns', icon: Megaphone, description: 'In-app messaging' },
      { id: 'landing-progress', label: 'Landing progress', icon: LineChart, description: 'Homepage stats' },
      { id: 'landing-joiners', label: 'Landing joiners', icon: Users2, description: 'New joiners feed' },
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    items: [
      { id: 'notifications', label: 'Email', icon: Mail, description: 'Campaigns & templates' },
      { id: 'forms', label: 'Forms', icon: ClipboardList, description: 'Lead capture' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'analytics', label: 'Analytics', icon: TrendingUp, description: 'Reports & charts' },
      { id: 'logs', label: 'Logs', icon: FileText, description: 'Activity & audit' },
      { id: 'settings', label: 'Settings', icon: Settings, description: 'Platform configuration' },
    ],
  },
];

export const ADMIN_TAB_IDS: AdminTabId[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));

export function isAdminTabId(value: string | null | undefined): value is AdminTabId {
  return Boolean(value && ADMIN_TAB_IDS.includes(value as AdminTabId));
}

export function getAdminNavItem(tabId: AdminTabId): AdminNavItem | undefined {
  for (const group of ADMIN_NAV_GROUPS) {
    const item = group.items.find((i) => i.id === tabId);
    if (item) return item;
  }
  return undefined;
}

export function getAdminNavGroup(tabId: AdminTabId): AdminNavGroup | undefined {
  return ADMIN_NAV_GROUPS.find((group) => group.items.some((item) => item.id === tabId));
}
