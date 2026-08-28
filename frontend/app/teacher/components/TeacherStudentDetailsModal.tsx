'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Calendar,
  Clock,
  BookOpen,
  Target,
  BarChart3,
  CheckCircle,
  Activity,
  FileText,
  Shield,
} from 'lucide-react';
import { AdminBadge, AdminStatCard, AdminStatGrid } from '../../admin/components/AdminUI';

export type TeacherStudentEnrollment = {
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessed: string;
  assignments?: Array<{
    assignmentId: string;
    title: string;
    score: number;
    maxScore: number;
    submittedAt: string;
  }>;
};

export type TeacherStudentRecord = {
  id: string;
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
  profileImage?: string;
  role?: string;
  enrolledDate?: string;
  progress: number;
  lastActive?: string;
  completedCourses: number;
  totalCourses: number;
  enrolledCourses?: TeacherStudentEnrollment[];
  averageProgress?: number;
  totalAssignments?: number;
  averageScore?: number;
  security?: {
    isLocked?: boolean;
    lockedUntil?: string;
    lockReason?: string;
  };
  isBlocked?: boolean;
  blockReason?: string;
  blockExpiry?: string;
};

export type TeacherStudentDetailsTab = 'overview' | 'performance' | 'courses';

type Props = {
  student: TeacherStudentRecord;
  onClose: () => void;
  initialTab?: TeacherStudentDetailsTab;
};

function getStudentId(student: TeacherStudentRecord) {
  return student.id || student._id || '';
}

function getDisplayName(student: TeacherStudentRecord) {
  if (student.firstName && student.lastName) return `${student.firstName} ${student.lastName}`;
  return student.name || 'Unknown student';
}

function getInitials(student: TeacherStudentRecord) {
  const first = student.firstName || student.name?.split(' ')[0] || student.email || '?';
  const last = student.lastName || student.name?.split(' ')[1] || '';
  if (last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  return first.charAt(0).toUpperCase();
}

function progressFillClass(progress: number) {
  if (progress >= 80) return 'teacher-progress__fill--high';
  if (progress >= 60) return 'teacher-progress__fill--mid';
  if (progress >= 40) return 'teacher-progress__fill--low';
  return 'teacher-progress__fill--critical';
}

function scoreTone(score: number, maxScore: number) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return 'emerald';
  if (pct >= 60) return 'amber';
  return 'rose';
}

export default function TeacherStudentDetailsModal({ student, onClose, initialTab = 'overview' }: Props) {
  const [activeTab, setActiveTab] = useState<TeacherStudentDetailsTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, student]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const isBlocked = Boolean(student.security?.isLocked || student.isBlocked);
  const enrollments = student.enrolledCourses || [];
  const avgProgress = student.averageProgress ?? student.progress ?? 0;
  const avgScore = student.averageScore ?? 0;
  const totalAssignments = student.totalAssignments ?? 0;

  const assignmentRows = useMemo(
    () =>
      enrollments.flatMap((enrollment) =>
        (enrollment.assignments || []).map((assignment) => ({
          ...assignment,
          courseTitle: enrollment.courseTitle,
        }))
      ),
    [enrollments]
  );

  const tabs: { id: TeacherStudentDetailsTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'courses', label: 'Courses', icon: BookOpen },
  ];

  return createPortal(
    <div
      className="teacher-student-modal fixed inset-0 z-[100] flex items-start justify-center overflow-hidden p-3 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="teacher-student-modal__surface flex max-h-[min(92dvh,calc(100dvh-1.5rem))] w-full max-w-[min(56rem,96vw)] min-h-0 flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="teacher-student-modal__header relative shrink-0 overflow-hidden px-5 py-4 sm:px-6">
          <div className="teacher-student-modal__header-mesh" aria-hidden />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="teacher-student-modal__avatar-ring">
                {student.profileImage || student.avatar ? (
                  <img src={student.profileImage || student.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white">
                    {getInitials(student)}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-lg font-bold text-white sm:text-xl">{getDisplayName(student)}</h3>
                  <span className="tsm-role-pill">Student</span>
                  {isBlocked ? (
                    <span className="tsm-status-pill is-blocked">Blocked</span>
                  ) : (
                    <span className="tsm-status-pill is-active">Active</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-emerald-100/85">{student.email}</p>
                <p className="mt-1 font-mono text-[11px] text-emerald-200/60">{getStudentId(student)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="teacher-student-modal__tabs shrink-0">
          <div className="tsm-tabs__list" role="tablist" aria-label="Student detail sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tsm-tabs__btn ${activeTab === tab.id ? 'is-active' : ''}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="teacher-student-modal__body">
          {activeTab === 'overview' && (
            <div className="tsm-tab-stack">
              <AdminStatGrid>
                <AdminStatCard label="Enrolled courses" value={student.totalCourses} icon={BookOpen} tone="emerald" />
                <AdminStatCard label="Avg progress" value={`${avgProgress}%`} icon={Target} tone="indigo" />
                <AdminStatCard label="Assignments" value={totalAssignments} icon={FileText} tone="violet" />
                <AdminStatCard label="Avg score" value={avgScore ? `${avgScore}%` : 'N/A'} icon={BarChart3} tone="amber" />
              </AdminStatGrid>

              <div className="tsm-info-grid">
                <div className="tsm-info-card">
                  <Mail className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="tsm-info-card__label">Email</p>
                    <p className="tsm-info-card__value">{student.email}</p>
                  </div>
                </div>
                <div className="tsm-info-card">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="tsm-info-card__label">Joined</p>
                    <p className="tsm-info-card__value">
                      {student.enrolledDate ? new Date(student.enrolledDate).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
                <div className="tsm-info-card">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="tsm-info-card__label">Last active</p>
                    <p className="tsm-info-card__value">
                      {student.lastActive ? new Date(student.lastActive).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="tsm-info-card">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="tsm-info-card__label">Account status</p>
                    <p className="tsm-info-card__value">{isBlocked ? 'Blocked' : 'Active'}</p>
                    {isBlocked && (student.security?.lockReason || student.blockReason) ? (
                      <p className="tsm-info-card__hint">{student.security?.lockReason || student.blockReason}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              {enrollments.length > 0 ? (
                <div className="tsm-panel">
                  <h4 className="tsm-panel__title">
                    <Activity className="h-4 w-4" />
                    Recent courses
                  </h4>
                  <div className="tsm-course-mini-list">
                    {enrollments.slice(0, 4).map((enrollment) => (
                      <div key={enrollment.courseId} className="tsm-course-mini">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[var(--admin-text)]">{enrollment.courseTitle}</p>
                          <p className="text-xs text-[var(--admin-muted)]">
                            Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex min-w-[5rem] items-center gap-2">
                          <div className="teacher-progress flex-1">
                            <div
                              className={`teacher-progress__fill ${progressFillClass(enrollment.progress)}`}
                              style={{ width: `${Math.min(100, enrollment.progress)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-[var(--admin-text)]">
                            {enrollment.progress}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="tsm-empty-inline">No course enrollments yet.</div>
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="tsm-tab-stack">
              <AdminStatGrid>
                <AdminStatCard label="Completed courses" value={student.completedCourses} icon={CheckCircle} tone="emerald" />
                <AdminStatCard label="Avg progress" value={`${avgProgress}%`} icon={Target} tone="indigo" />
                <AdminStatCard label="Total assignments" value={totalAssignments} icon={FileText} tone="violet" />
                <AdminStatCard label="Average score" value={avgScore ? `${avgScore}%` : 'N/A'} icon={BarChart3} tone="amber" />
              </AdminStatGrid>

              {assignmentRows.length > 0 ? (
                <div className="tsm-panel">
                  <h4 className="tsm-panel__title">
                    <FileText className="h-4 w-4" />
                    Assignment scores
                  </h4>
                  <div className="tsm-assignment-list">
                    {assignmentRows.map((assignment, idx) => (
                      <div key={`${assignment.assignmentId}-${idx}`} className="tsm-assignment-row">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--admin-text)]">{assignment.title}</p>
                          <p className="truncate text-xs text-[var(--admin-muted)]">{assignment.courseTitle}</p>
                        </div>
                        <AdminBadge tone={scoreTone(assignment.score, assignment.maxScore)}>
                          {assignment.score}/{assignment.maxScore}
                        </AdminBadge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="tsm-panel">
                <h4 className="tsm-panel__title">
                  <BarChart3 className="h-4 w-4" />
                  Course performance
                </h4>
                {enrollments.length === 0 ? (
                  <div className="tsm-empty-inline">No performance data yet.</div>
                ) : (
                  <div className="tsm-performance-list">
                    {enrollments.map((enrollment) => (
                      <article key={enrollment.courseId} className="tsm-performance-card">
                        <div className="tsm-performance-card__head">
                          <h5 className="truncate font-semibold text-[var(--admin-text)]">{enrollment.courseTitle}</h5>
                          <span className="text-xs text-[var(--admin-muted)]">
                            {new Date(enrollment.enrolledAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="tsm-performance-card__metrics">
                          <div>
                            <p className="tsm-metric-label">Progress</p>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="teacher-progress flex-1">
                                <div
                                  className={`teacher-progress__fill ${progressFillClass(enrollment.progress)}`}
                                  style={{ width: `${Math.min(100, enrollment.progress)}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold tabular-nums text-[var(--admin-text)]">
                                {enrollment.progress}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="tsm-metric-label">Lessons completed</p>
                            <p className="tsm-metric-value">
                              {enrollment.completedLessons}/{enrollment.totalLessons || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="tsm-metric-label">Last active</p>
                            <p className="tsm-metric-value">
                              {enrollment.lastAccessed
                                ? new Date(enrollment.lastAccessed).toLocaleDateString()
                                : '—'}
                            </p>
                          </div>
                        </div>
                        {enrollment.assignments && enrollment.assignments.length > 0 ? (
                          <div className="tsm-assignment-list mt-3 border-t border-[var(--admin-border)] pt-3">
                            {enrollment.assignments.map((assignment, idx) => (
                              <div key={idx} className="tsm-assignment-row">
                                <span className="truncate text-sm text-[var(--admin-muted)]">{assignment.title}</span>
                                <AdminBadge tone={scoreTone(assignment.score, assignment.maxScore)}>
                                  {assignment.score}/{assignment.maxScore}
                                </AdminBadge>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="tsm-tab-stack">
              {enrollments.length === 0 ? (
                <div className="tsm-empty-inline">This student is not enrolled in any courses.</div>
              ) : (
                <div className="tsm-course-cards">
                  {enrollments.map((enrollment) => (
                    <article key={enrollment.courseId} className="tsm-course-card">
                      <div className="tsm-course-card__icon">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="truncate font-semibold text-[var(--admin-text)]">{enrollment.courseTitle}</h5>
                        <p className="text-xs text-[var(--admin-muted)]">
                          Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="teacher-progress flex-1">
                            <div
                              className={`teacher-progress__fill ${progressFillClass(enrollment.progress)}`}
                              style={{ width: `${Math.min(100, enrollment.progress)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums">{enrollment.progress}%</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--admin-muted)]">
                          {enrollment.completedLessons} lessons completed
                          {enrollment.lastAccessed
                            ? ` · Last active ${new Date(enrollment.lastAccessed).toLocaleDateString()}`
                            : ''}
                        </p>
                      </div>
                      {enrollment.progress >= 100 ? (
                        <AdminBadge tone="emerald">Complete</AdminBadge>
                      ) : (
                        <AdminBadge tone="sky">In progress</AdminBadge>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
