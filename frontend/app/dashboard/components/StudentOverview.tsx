'use client';

import React from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import {
  Award,
  Bell,
  BookOpen,
  BookOpen as BookOpenIcon,
  FileText,
  Play,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import {
  AdminEmptyState,
  AdminPage,
  AdminPanel,
  AdminPanelHeader,
  AdminStatCard,
  AdminStatGrid,
} from '../../admin/components/AdminUI';
import type { StudentTabId } from '../config/nav';

type Activity = {
  id: string;
  title: string;
  message: string;
  timestamp: string | Date;
  icon?: string;
  color?: string;
  type?: string;
  sessionId?: string;
  meetingLink?: string;
};

type Course = {
  _id: string;
  title: string;
  progress?: number;
  completedLessons?: number;
  totalLessons?: number;
  completedQuizzes?: number;
  totalQuizzes?: number;
  completedAssignments?: number;
  totalAssignments?: number;
};

type Props = {
  platformName?: string;
  studentName?: string;
  courses: Course[];
  signalsCount: number;
  pendingAssignments: number;
  certificatesEarned: number;
  certificatesPending: number;
  liveSessionsCount: number;
  recentActivity: Activity[];
  activityLoading: boolean;
  onRefreshActivity: () => void;
  onTabChange: (tab: StudentTabId) => void;
  getActivityIcon: (iconName: string) => React.ComponentType<{ className?: string }>;
  getActivityColorClasses: (color: string) => {
    bg: string;
    border: string;
    iconBg: string;
    iconText: string;
  };
  formatTimeAgo: (timestamp: string | Date) => string;
  onSignUpSession?: (sessionId: string) => void;
  onOpenMeeting?: (sessionId: string) => void;
  calculateCertificateEligibility?: (course: Course) => boolean;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function StudentOverview({
  platformName = 'Forex Navigators',
  studentName = 'Trader',
  courses,
  signalsCount,
  pendingAssignments,
  certificatesEarned,
  certificatesPending,
  liveSessionsCount,
  recentActivity,
  activityLoading,
  onRefreshActivity,
  onTabChange,
  getActivityIcon,
  getActivityColorClasses,
  formatTimeAgo,
  onSignUpSession,
  onOpenMeeting,
  calculateCertificateEligibility,
}: Props) {
  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const avgProgress =
    courses.length > 0
      ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length)
      : 0;

  const quickActions = [
    {
      id: 'courses' as const,
      title: 'Continue learning',
      sub: 'Pick up where you left off',
      icon: BookOpenIcon,
    },
    {
      id: 'signals' as const,
      title: 'Trading signals',
      sub: `${signalsCount} active ideas`,
      icon: Target,
    },
    {
      id: 'live-sessions' as const,
      title: 'Live sessions',
      sub: `${liveSessionsCount} scheduled`,
      icon: Video,
    },
    {
      id: 'community' as const,
      title: 'Community',
      sub: 'Chat with traders',
      icon: Users,
    },
  ];

  return (
    <AdminPage>
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="student-hero"
      >
        <div className="student-hero__aurora" aria-hidden />
        <div className="student-hero__grid" aria-hidden />
        <div className="student-hero__content">
          <div>
            <p className="student-hero__eyebrow">{platformName}</p>
            <h2 className="student-hero__title">
              {greeting()}, {studentName}
            </h2>
            <p className="student-hero__date">{todayStr}</p>
            <div className="student-hero__cta-row">
              <button
                type="button"
                className="student-hero__cta student-hero__cta--primary"
                onClick={() => onTabChange('courses')}
              >
                <BookOpen className="h-4 w-4" />
                My courses
              </button>
              <button
                type="button"
                className="student-hero__cta student-hero__cta--ghost"
                onClick={() => onTabChange('tradingview')}
              >
                <TrendingUp className="h-4 w-4" />
                Open charts
              </button>
            </div>
          </div>
          <div className="student-hero__pills">
            <div className="student-hero__pill">
              <BookOpen className="h-4 w-4 text-sky-400" />
              <span>
                <strong>{courses.length}</strong> enrolled
              </span>
            </div>
            <div className="student-hero__pill">
              <Target className="h-4 w-4 text-emerald-400" />
              <span>
                <strong>{avgProgress}%</strong> avg progress
              </span>
            </div>
            <div className="student-hero__pill">
              <Award className="h-4 w-4 text-violet-400" />
              <span>
                <strong>{certificatesEarned}</strong> certificates
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="student-bento">
        <div className="student-bento__metrics">
          <AdminStatGrid>
            <AdminStatCard
              label="Enrolled courses"
              value={<CountUp end={courses.length} duration={1.1} />}
              icon={BookOpen}
              tone="sky"
            />
            <AdminStatCard
              label="Active signals"
              value={<CountUp end={signalsCount} duration={1.1} />}
              icon={Target}
              tone="emerald"
            />
            <AdminStatCard
              label="Pending tasks"
              value={<CountUp end={pendingAssignments} duration={1.1} />}
              icon={FileText}
              tone="amber"
            />
            <AdminStatCard
              label="Certificates"
              value={<CountUp end={certificatesEarned} duration={1.1} />}
              hint={certificatesPending > 0 ? `${certificatesPending} pending` : undefined}
              icon={Award}
              tone="violet"
            />
          </AdminStatGrid>
        </div>

        <div className="student-bento__actions">
          <AdminPanel>
            <AdminPanelHeader title="Quick actions" description="Jump straight into your workflow" />
            <div className="student-quick-actions">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    className="student-quick-action"
                    onClick={() => onTabChange(action.id)}
                  >
                    <span className="student-quick-action__icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="student-quick-action__title">{action.title}</span>
                    <span className="student-quick-action__sub">{action.sub}</span>
                  </button>
                );
              })}
            </div>
          </AdminPanel>
        </div>

        <div className="student-bento__activity">
          <AdminPanel>
            <AdminPanelHeader
              title="Recent activity"
              description="Your latest learning and trading updates"
              actions={
                <button
                  type="button"
                  onClick={onRefreshActivity}
                  disabled={activityLoading}
                  className="admin-icon-btn"
                  title="Refresh activity"
                >
                  <RefreshCw className={`h-4 w-4 ${activityLoading ? 'animate-spin' : ''}`} />
                </button>
              }
            />
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <AdminEmptyState
                icon={Bell}
                title="No recent activity"
                description="Complete a lesson, join a session, or check signals to see updates here."
                action={
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={() => onTabChange('browse')}
                  >
                    Browse courses
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const IconComponent = getActivityIcon(activity.icon || 'Bell');
                  const colorClasses = getActivityColorClasses(activity.color || 'gray');
                  return (
                    <div
                      key={activity.id}
                      className={`overview-feed-item rounded-xl border p-3 ${colorClasses.bg} ${colorClasses.border}`}
                    >
                      <div className={`overview-feed-item__avatar ${colorClasses.iconBg} ${colorClasses.iconText}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--admin-text)]">{activity.title}</p>
                        <p className="truncate text-xs text-[var(--admin-muted)]">{activity.message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                        <span className="text-xs text-[var(--admin-muted)]">{formatTimeAgo(activity.timestamp)}</span>
                        {activity.type === 'live_session' && activity.sessionId && onSignUpSession ? (
                          <button
                            type="button"
                            onClick={() => onSignUpSession(activity.sessionId!)}
                            className="admin-btn admin-btn--primary !px-2.5 !py-1 !text-xs"
                          >
                            Sign up
                          </button>
                        ) : null}
                        {activity.type === 'live_session' && activity.meetingLink && activity.sessionId && onOpenMeeting ? (
                          <button
                            type="button"
                            onClick={() => onOpenMeeting(activity.sessionId!)}
                            className="admin-btn admin-btn--secondary !px-2.5 !py-1 !text-xs"
                          >
                            <Play className="h-3 w-3" />
                            Join
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AdminPanel>
        </div>

        <div className="student-bento__progress">
          <AdminPanel>
            <AdminPanelHeader
              title="Course progress"
              description={courses.length ? 'Your top enrollments' : 'Start your learning path'}
              actions={
                courses.length > 0 ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost !text-xs"
                    onClick={() => onTabChange('courses')}
                  >
                    View all
                  </button>
                ) : null
              }
            />
            {courses.length === 0 ? (
              <AdminEmptyState
                icon={BookOpen}
                title="No courses yet"
                description="Browse the catalog and enroll in your first course."
                action={
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={() => onTabChange('browse')}
                  >
                    Browse courses
                  </button>
                }
              />
            ) : (
              <div className="student-course-progress">
                {courses.slice(0, 4).map((course) => (
                  <div key={course._id} className="student-course-progress__item">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--admin-text)]">{course.title}</p>
                      <span className="shrink-0 text-xs font-bold text-[var(--admin-accent)]">
                        {course.progress || 0}%
                      </span>
                    </div>
                    <div className="student-course-progress__bar">
                      <div
                        className="student-course-progress__fill"
                        style={{ width: `${Math.min(100, course.progress || 0)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-[var(--admin-muted)] sm:text-xs">
                      <span>
                        Lessons {course.completedLessons || 0}/{course.totalLessons || 0}
                      </span>
                      <span>
                        Tasks {course.completedAssignments || 0}/{course.totalAssignments || 0}
                      </span>
                    </div>
                    {calculateCertificateEligibility?.(course) ? (
                      <p className="mt-2 text-center text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        Certificate eligible — finish remaining requirements
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}
