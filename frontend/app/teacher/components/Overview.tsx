'use client';

import React from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import {
  Users,
  BookOpen,
  TrendingUp,
  Award,
  Clock,
  ArrowRight,
  ArrowUpRight,
  Video,
  MessageSquare,
  Activity,
  BookMarked,
} from 'lucide-react';
import { Student, LiveSession, Analytics } from '../types';
import type { TeacherTabId } from '../config/nav';
import { AdminPanel, AdminPanelHeader } from '../../admin/components/AdminUI';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function studentName(student: Student): string {
  if (student.firstName && student.lastName) return `${student.firstName} ${student.lastName}`;
  return student.name || 'Unknown student';
}

function studentInitial(student: Student): string {
  const name = student.firstName || student.name || student.email || '?';
  return name.charAt(0).toUpperCase();
}

type MetricProps = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  accent: 'indigo' | 'emerald' | 'violet' | 'sky';
  icon: React.ReactNode;
  delay?: number;
};

function MetricTile({ label, value, prefix = '', suffix = '', decimals = 0, accent, icon, delay = 0 }: MetricProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`overview-metric overview-metric--${accent}`}
    >
      <div className="overview-metric__glow" aria-hidden />
      <div className="overview-metric__top">
        <div className="overview-metric__icon">{icon}</div>
      </div>
      <p className="overview-metric__label">{label}</p>
      <p className="overview-metric__value">
        {prefix}
        <CountUp end={value} duration={1.2} decimals={decimals} separator="," />
        {suffix}
      </p>
    </motion.article>
  );
}

type ActionTileProps = {
  title: string;
  subtitle: string;
  accent: string;
  icon: React.ReactNode;
  onClick: () => void;
};

function ActionTile({ title, subtitle, accent, icon, onClick }: ActionTileProps) {
  return (
    <button type="button" onClick={onClick} className={`overview-action-tile ${accent}`}>
      <div className="overview-action-tile__icon">{icon}</div>
      <div className="overview-action-tile__body">
        <span className="overview-action-tile__title">{title}</span>
        <span className="overview-action-tile__sub">{subtitle}</span>
      </div>
      <ArrowUpRight className="overview-action-tile__arrow" />
    </button>
  );
}

interface OverviewProps {
  analytics: Analytics | null;
  students: Student[];
  liveSessions: LiveSession[];
  isLoading: boolean;
  onRefresh: () => void;
  onTabChange: (tab: TeacherTabId) => void;
  teacherName?: string;
  platformName?: string;
  getSessionStatusColor: (status: string) => string;
}

export default function Overview({
  analytics,
  students,
  liveSessions,
  isLoading,
  onRefresh,
  onTabChange,
  teacherName = 'Teacher',
  platformName = 'Forex Navigators',
  getSessionStatusColor,
}: OverviewProps) {
  const scheduledSessions = liveSessions.filter((s) => s.status === 'scheduled');
  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="overview-command">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overview-hero"
      >
        <div className="overview-hero__mesh" aria-hidden />
        <div className="overview-hero__content">
          <div>
            <p className="overview-hero__eyebrow">{platformName}</p>
            <h2 className="overview-hero__title">
              {greeting()}, {teacherName}
            </h2>
            <p className="overview-hero__date">{todayStr}</p>
          </div>
          <div className="overview-hero__pills">
            <div className="overview-hero__pill">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>
                <strong>{analytics?.totalStudents ?? students.length}</strong> students
              </span>
            </div>
            <div className="overview-hero__pill">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <span>
                <strong>{analytics?.totalCourses ?? 0}</strong> courses
              </span>
            </div>
            <div className="overview-hero__pill">
              <Video className="h-4 w-4 text-violet-400" />
              <span>
                <strong>{scheduledSessions.length}</strong> upcoming sessions
              </span>
            </div>
          </div>
          <div className="overview-hero__actions">
            <button type="button" className="overview-hero__primary-action" onClick={() => onTabChange('courses')}>
              Manage courses <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="overview-hero__secondary-action"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <Activity className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing…' : 'Refresh data'}
            </button>
          </div>
        </div>
      </motion.header>

      <div className="overview-metrics-grid">
        <MetricTile
          label="Total students"
          value={analytics?.totalStudents ?? students.length}
          accent="emerald"
          icon={<Users className="h-5 w-5" />}
        />
        <MetricTile
          label="Active courses"
          value={analytics?.totalCourses ?? 0}
          accent="indigo"
          icon={<BookOpen className="h-5 w-5" />}
          delay={0.06}
        />
        <MetricTile
          label="Revenue"
          value={analytics?.totalRevenue ?? 0}
          prefix="$"
          decimals={0}
          accent="violet"
          icon={<TrendingUp className="h-5 w-5" />}
          delay={0.12}
        />
        <MetricTile
          label="Avg rating"
          value={analytics?.averageRating ?? 0}
          suffix="/5"
          decimals={1}
          accent="sky"
          icon={<Award className="h-5 w-5" />}
          delay={0.18}
        />
      </div>

      <section className="overview-panel overview-panel--actions">
        <div className="overview-panel__head">
          <div>
            <h3 className="overview-panel__title">Quick actions</h3>
            <p className="overview-panel__sub">Jump to common teaching tasks</p>
          </div>
        </div>
        <div className="overview-actions-grid">
        <ActionTile
          title="View students"
          subtitle="Roster & enrollment progress"
          accent="overview-action-tile--emerald"
          icon={<Users className="h-5 w-5" />}
          onClick={() => onTabChange('students')}
        />
        <ActionTile
          title="Live sessions"
          subtitle="Schedule and host classes"
          accent="overview-action-tile--indigo"
          icon={<Video className="h-5 w-5" />}
          onClick={() => onTabChange('live-sessions')}
        />
        <ActionTile
          title="Assignments"
          subtitle="Review submissions"
          accent="overview-action-tile--violet"
          icon={<BookMarked className="h-5 w-5" />}
          onClick={() => onTabChange('assignments')}
        />
        <ActionTile
          title="Messages"
          subtitle="Reach your students"
          accent="overview-action-tile--amber"
          icon={<MessageSquare className="h-5 w-5" />}
          onClick={() => onTabChange('communications')}
        />
        </div>
      </section>

      <div className="teacher-overview-split">
        <AdminPanel>
          <AdminPanelHeader title="Recent enrollments" description="Latest students on your roster" />
          <div className="overview-feed">
            {students.length > 0 ? (
              students.slice(0, 6).map((student) => (
                <div key={student.id || student._id} className="overview-feed-item">
                  <div className="overview-feed-item__avatar is-user">{studentInitial(student)}</div>
                  <div className="overview-feed-item__main">
                    <div className="overview-feed-item__row">
                      <span className="overview-feed-item__title">{studentName(student)}</span>
                    </div>
                    <p className="overview-feed-item__meta">{student.email}</p>
                    {student.enrolledCourses?.length ? (
                      <p className="overview-feed-item__meta">
                        {student.enrolledCourses.length} course{student.enrolledCourses.length > 1 ? 's' : ''}
                      </p>
                    ) : null}
                  </div>
                  <time className="overview-feed-item__time">
                    {student.enrolledDate
                      ? new Date(student.enrolledDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </time>
                </div>
              ))
            ) : (
              <div className="admin-empty">
                <Users className="admin-empty__icon" />
                <p className="admin-empty__title">No students yet</p>
                <p className="admin-empty__description">Enrollments will appear here as students join your courses.</p>
              </div>
            )}
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title="Upcoming live sessions" description="Scheduled classes on your calendar" />
          <div className="overview-feed">
            {scheduledSessions.length > 0 ? (
              scheduledSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="overview-feed-item">
                  <div className="overview-feed-item__avatar is-payment">
                    <Video className="h-4 w-4" />
                  </div>
                  <div className="overview-feed-item__main">
                    <div className="overview-feed-item__row">
                      <span className="overview-feed-item__title">{session.title}</span>
                      <span className={`admin-badge admin-badge--emerald text-[10px] ${getSessionStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    <p className="overview-feed-item__meta">{session.courseName || 'General session'}</p>
                    <p className="overview-feed-item__meta flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {session.scheduledDate
                        ? new Date(session.scheduledDate).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'Date not set'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="admin-empty">
                <Clock className="admin-empty__icon" />
                <p className="admin-empty__title">No upcoming sessions</p>
                <p className="admin-empty__description">Schedule a live session to see it on your dashboard.</p>
                <button type="button" className="admin-btn admin-btn--primary mt-3" onClick={() => onTabChange('live-sessions')}>
                  Open live sessions
                </button>
              </div>
            )}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
