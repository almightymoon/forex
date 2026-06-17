import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CandlestickChart,
  ChevronRight,
  ClipboardList,
  FileText,
  GraduationCap,
  Headphones,
  HelpCircle,
  Home,
  Info,
  LayoutGrid,
  Layers,
  LogOut,
  MessageSquare,
  Radio,
  Settings,
  Share2,
  Sparkles,
  TrendingUp,
  Trophy,
  User,
  Users,
  Video,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

export type AppIconName =
  | 'home'
  | 'courses'
  | 'community'
  | 'signals'
  | 'more'
  | 'notifications'
  | 'user'
  | 'chevron-right'
  | 'book-open'
  | 'graduation-cap'
  | 'radio'
  | 'award'
  | 'sparkles'
  | 'activity'
  | 'candlestick'
  | 'trending-up'
  | 'trending-down'
  | 'video'
  | 'users'
  | 'bar-chart'
  | 'share'
  | 'trophy'
  | 'wallet'
  | 'clipboard'
  | 'layers'
  | 'headphones'
  | 'help'
  | 'info'
  | 'file-text'
  | 'settings'
  | 'log-out'
  | 'live-charts'
  | 'zap';

const ICONS: Record<AppIconName, LucideIcon> = {
  home: Home,
  courses: GraduationCap,
  community: MessageSquare,
  signals: CandlestickChart,
  more: LayoutGrid,
  notifications: Bell,
  user: User,
  'chevron-right': ChevronRight,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  radio: Radio,
  award: Award,
  sparkles: Sparkles,
  activity: Activity,
  candlestick: CandlestickChart,
  'trending-up': ArrowUpRight,
  'trending-down': ArrowDownRight,
  video: Video,
  users: Users,
  'bar-chart': BarChart3,
  share: Share2,
  trophy: Trophy,
  wallet: Wallet,
  clipboard: ClipboardList,
  layers: Layers,
  headphones: Headphones,
  help: HelpCircle,
  info: Info,
  'file-text': FileText,
  settings: Settings,
  'log-out': LogOut,
  'live-charts': TrendingUp,
  zap: Zap,
};

type Props = {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function AppIcon({ name, size = 20, color = '#fff', strokeWidth = 2 }: Props) {
  const Icon = ICONS[name];
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
