'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  BookOpen,
  CheckCircle,
  FileText,
  Play,
  Search,
  Target,
} from 'lucide-react';
import { AdminEmptyState } from '../../admin/components/AdminUI';
import './my-courses.css';

export interface MyCourse {
  _id: string;
  title: string;
  description: string;
  thumbnail?: string;
  instructor?: {
    firstName?: string;
    lastName?: string;
  };
  teacher?: {
    firstName?: string;
    lastName?: string;
  };
  category?: string;
  level?: string;
  progress?: number;
  totalLessons?: number;
  completedLessons?: number;
  totalQuizzes?: number;
  completedQuizzes?: number;
  totalAssignments?: number;
  completedAssignments?: number;
  averageGrade?: number;
  certificateIssued?: boolean;
}

interface MyCoursesProps {
  courses: MyCourse[];
  onBrowse: () => void;
  isCertificateEligible: (course: MyCourse) => boolean;
  labels?: {
    search?: string;
    emptyTitle?: string;
    emptyHint?: string;
    browse?: string;
    continueLearning?: string;
    progress?: string;
    lessons?: string;
    quizzes?: string;
    assignments?: string;
    certificateEligible?: string;
    certificateEarned?: string;
  };
}

type ProgressFilter = 'all' | 'in-progress' | 'not-started' | 'completed';

function getInstructorName(course: MyCourse): string {
  const person = course.instructor || course.teacher;
  if (!person) return '';
  return `${person.firstName || ''} ${person.lastName || ''}`.trim();
}

function progressStatus(progress: number): ProgressFilter {
  if (progress >= 100) return 'completed';
  if (progress > 0) return 'in-progress';
  return 'not-started';
}

export default function MyCourses({
  courses,
  onBrowse,
  isCertificateEligible,
  labels = {},
}: MyCoursesProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProgressFilter>('all');

  const filtered = useMemo(() => {
    let list = [...courses];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          getInstructorName(c).toLowerCase().includes(q)
      );
    }
    if (filter !== 'all') {
      list = list.filter((c) => progressStatus(c.progress || 0) === filter);
    }
    list.sort((a, b) => {
      const pa = a.progress || 0;
      const pb = b.progress || 0;
      if (pa === 100 && pb !== 100) return 1;
      if (pb === 100 && pa !== 100) return -1;
      return pb - pa;
    });
    return list;
  }, [courses, search, filter]);

  const counts = useMemo(() => {
    const all = courses.length;
    let inProgress = 0;
    let notStarted = 0;
    let completed = 0;
    courses.forEach((c) => {
      const s = progressStatus(c.progress || 0);
      if (s === 'in-progress') inProgress += 1;
      else if (s === 'completed') completed += 1;
      else notStarted += 1;
    });
    return { all, inProgress, notStarted, completed };
  }, [courses]);

  const openCourse = (id: string) => router.push(`/course/${id}`);

  if (courses.length === 0) {
    return (
      <div className="my-courses">
        <AdminEmptyState
          icon={BookOpen}
          title={labels.emptyTitle || 'No courses enrolled yet'}
          description={labels.emptyHint || 'Browse the catalog and enroll to start learning.'}
          action={
            <div className="my-courses__empty-actions">
              <button type="button" className="my-courses__btn" onClick={onBrowse}>
                {labels.browse || 'Browse courses'}
              </button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="my-courses">
      <div className="my-courses__toolbar">
        <div className="my-courses__search">
          <Search className="my-courses__search-icon h-4 w-4" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.search || 'Search your courses…'}
            aria-label="Search enrolled courses"
          />
        </div>
        <div className="my-courses__filters">
          {(
            [
              ['all', `All (${counts.all})`],
              ['in-progress', `In progress (${counts.inProgress})`],
              ['not-started', `Not started (${counts.notStarted})`],
              ['completed', `Completed (${counts.completed})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`my-courses__pill ${filter === id ? 'is-active' : ''}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="my-courses__meta">
        <strong>{filtered.length}</strong> course{filtered.length === 1 ? '' : 's'}
        {search ? ` matching “${search}”` : ' in your library'}
      </p>

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={BookOpen}
          title="No matching courses"
          description="Try a different search or clear your progress filter."
        />
      ) : (
        <div className="my-courses__grid">
          {filtered.map((course) => {
            const progress = Math.min(100, Math.max(0, course.progress || 0));
            const status = progressStatus(progress);
            const instructor = getInstructorName(course);
            const eligible = isCertificateEligible(course);
            const lessonsDone = course.completedLessons || 0;
            const lessonsTotal = course.totalLessons || 0;

            return (
              <article
                key={course._id}
                className="my-courses__card"
                onClick={() => openCourse(course._id)}
                onKeyDown={(e) => e.key === 'Enter' && openCourse(course._id)}
                role="link"
                tabIndex={0}
              >
                <div className="my-courses__thumb">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <div className="my-courses__thumb-placeholder">
                      <BookOpen className="h-12 w-12" />
                    </div>
                  )}
                  {status === 'completed' ? (
                    <span className="my-courses__badge my-courses__badge--done">Completed</span>
                  ) : status === 'in-progress' ? (
                    <span className="my-courses__badge my-courses__badge--progress">
                      {progress}% done
                    </span>
                  ) : null}
                  {course.certificateIssued ? (
                    <span className="my-courses__badge my-courses__badge--cert">
                      <Award className="mr-0.5 inline h-3 w-3" />
                      Cert
                    </span>
                  ) : null}
                </div>

                <div className="my-courses__body">
                  <h3 className="my-courses__title">{course.title}</h3>
                  {instructor ? (
                    <p className="my-courses__instructor">{instructor}</p>
                  ) : null}

                  <div className="my-courses__progress">
                    <div className="my-courses__progress-row">
                      <span>{labels.progress || 'Progress'}</span>
                      <strong>{progress}%</strong>
                    </div>
                    <div className="my-courses__progress-bar">
                      <div
                        className={`my-courses__progress-fill${
                          progress >= 100 ? ' is-complete' : ''
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="my-courses__stats">
                    <span>
                      <Play className="h-3 w-3" />
                      {lessonsDone}/{lessonsTotal} {labels.lessons || 'lessons'}
                    </span>
                    {(course.totalQuizzes || 0) > 0 ? (
                      <span>
                        <Target className="h-3 w-3" />
                        {course.completedQuizzes || 0}/{course.totalQuizzes}{' '}
                        {labels.quizzes || 'quizzes'}
                      </span>
                    ) : null}
                    {(course.totalAssignments || 0) > 0 ? (
                      <span>
                        <FileText className="h-3 w-3" />
                        {course.completedAssignments || 0}/{course.totalAssignments}{' '}
                        {labels.assignments || 'assignments'}
                      </span>
                    ) : null}
                  </div>

                  <div className="my-courses__tags">
                    {course.level ? <span className="my-courses__tag">{course.level}</span> : null}
                    {course.category ? (
                      <span className="my-courses__tag">{course.category}</span>
                    ) : null}
                  </div>

                  {course.certificateIssued ? (
                    <div className="my-courses__alert my-courses__alert--earned">
                      <CheckCircle className="mr-1 inline h-3.5 w-3.5" />
                      {labels.certificateEarned || 'Certificate earned'}
                    </div>
                  ) : eligible ? (
                    <div className="my-courses__alert my-courses__alert--eligible">
                      <Award className="mr-1 inline h-3.5 w-3.5" />
                      {labels.certificateEligible || 'Certificate eligible'}
                    </div>
                  ) : null}

                  <div className="my-courses__footer" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="my-courses__btn"
                      onClick={() => openCourse(course._id)}
                    >
                      {progress >= 100
                        ? 'Review course'
                        : progress > 0
                          ? labels.continueLearning || 'Continue learning'
                          : 'Start learning'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
