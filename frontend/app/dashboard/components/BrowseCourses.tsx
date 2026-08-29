'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Clock, Play, Search, Star, Users } from 'lucide-react';
import { AdminEmptyState } from '../../admin/components/AdminUI';
import './browse-courses.css';

export interface BrowseCourse {
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
  category: string;
  level: string;
  rating?: number;
  totalRatings?: number;
  totalStudents?: number;
  totalVideos?: number;
  totalLessons?: number;
  lessonCount?: number;
  totalDuration?: number;
  price?: number;
  currency?: string;
}

function getInstructorName(course: BrowseCourse): string {
  const person = course.instructor || course.teacher;
  if (!person) return '';
  return `${person.firstName || ''} ${person.lastName || ''}`.trim();
}

interface BrowseCoursesProps {
  courses: BrowseCourse[];
  enrolledCourseIds: string[];
  loading: boolean;
  onEnroll: (courseId: string) => void;
  labels?: {
    search?: string;
    noCourses?: string;
    noCoursesHint?: string;
    loading?: string;
    enroll?: string;
    viewCourse?: string;
    continueLearning?: string;
    instructor?: string;
    lessons?: string;
    duration?: string;
  };
}

type SortOption = 'popular' | 'rating' | 'price-low' | 'price-high' | 'title';

function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(rating * 2) / 2;
  return (
    <span className="browse-courses__stars" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={i <= filled ? '' : 'opacity-30'}
          style={i <= filled ? undefined : { fill: 'transparent', color: 'var(--admin-muted)' }}
        />
      ))}
    </span>
  );
}

export default function BrowseCourses({
  courses,
  enrolledCourseIds,
  loading,
  onEnroll,
  labels = {},
}: BrowseCoursesProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortOption>('popular');

  const categories = useMemo(() => {
    const set = new Set(courses.map((c) => c.category).filter(Boolean));
    return Array.from(set).sort();
  }, [courses]);

  const levels = useMemo(() => {
    const set = new Set(courses.map((c) => c.level).filter(Boolean));
    return Array.from(set).sort();
  }, [courses]);

  const filtered = useMemo(() => {
    let list = [...courses];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          `${getInstructorName(c)}`.toLowerCase().includes(q)
      );
    }
    if (levelFilter !== 'all') {
      list = list.filter((c) => c.level?.toLowerCase() === levelFilter.toLowerCase());
    }
    if (categoryFilter !== 'all') {
      list = list.filter((c) => c.category === categoryFilter);
    }
    switch (sort) {
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'price-low':
        list.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        list.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'title':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        list.sort((a, b) => (b.totalStudents || 0) - (a.totalStudents || 0));
    }
    return list;
  }, [courses, search, levelFilter, categoryFilter, sort]);

  const openCourse = (id: string) => router.push(`/course/${id}`);

  if (loading && courses.length === 0) {
    return (
      <div className="browse-courses__loading">
        <div className="browse-courses__spinner" />
        <p className="text-sm font-medium text-[var(--admin-muted)]">
          {labels.loading || 'Loading courses…'}
        </p>
      </div>
    );
  }

  return (
    <div className="browse-courses">
      <div className="browse-courses__toolbar">
        <div className="browse-courses__search">
          <Search className="browse-courses__search-icon h-4 w-4" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.search || 'Search courses, topics, or instructors…'}
            aria-label="Search courses"
          />
        </div>
        <div className="browse-courses__filters">
          <select
            className="browse-courses__filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            className="browse-courses__filter-select"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="Filter by level"
          >
            <option value="all">All levels</option>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
          <select
            className="browse-courses__filter-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            aria-label="Sort courses"
          >
            <option value="popular">Most popular</option>
            <option value="rating">Highest rated</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      <p className="browse-courses__meta">
        <strong>{filtered.length}</strong> course{filtered.length === 1 ? '' : 's'}
        {search ? ` matching “${search}”` : ' available'}
      </p>

      {levels.length > 1 ? (
        <div className="browse-courses__filters">
          <button
            type="button"
            className={`browse-courses__pill ${levelFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setLevelFilter('all')}
          >
            All
          </button>
          {levels.map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`browse-courses__pill ${levelFilter === lvl ? 'is-active' : ''}`}
              onClick={() => setLevelFilter(lvl)}
            >
              {lvl}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={BookOpen}
          title={labels.noCourses || 'No courses found'}
          description={
            labels.noCoursesHint ||
            (search ? 'Try a different search or clear your filters.' : 'No courses have been published yet.')
          }
        />
      ) : (
        <div className="browse-courses__grid">
          {filtered.map((course) => {
            const isEnrolled = enrolledCourseIds.includes(course._id);
            const isFree = !course.price || course.price === 0;
            const instructor = getInstructorName(course) || 'Instructor';
            const rating = course.rating || 0;
            const durationMin = course.totalDuration ? Math.round(course.totalDuration / 60) : 0;
            const lessonCount = course.totalVideos || course.lessonCount || course.totalLessons || 0;

            return (
              <article
                key={course._id}
                className="browse-courses__card"
                onClick={() => openCourse(course._id)}
                onKeyDown={(e) => e.key === 'Enter' && openCourse(course._id)}
                role="link"
                tabIndex={0}
              >
                <div className="browse-courses__thumb">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <div className="browse-courses__thumb-placeholder">
                      <BookOpen className="h-12 w-12" />
                    </div>
                  )}
                  {isEnrolled ? (
                    <span className="browse-courses__badge browse-courses__badge--enrolled">Enrolled</span>
                  ) : null}
                  {isFree ? (
                    <span className="browse-courses__badge browse-courses__badge--free">Free</span>
                  ) : null}
                </div>

                <div className="browse-courses__body">
                  <h3 className="browse-courses__title">{course.title}</h3>
                  <p className="browse-courses__instructor">
                    {labels.instructor || 'Instructor'}: {instructor || '—'}
                  </p>

                  <div className="browse-courses__rating-row">
                    <span className="browse-courses__rating-num">{rating > 0 ? rating.toFixed(1) : 'New'}</span>
                    {rating > 0 ? <StarRating rating={rating} /> : null}
                    {course.totalRatings ? (
                      <span className="browse-courses__rating-count">({course.totalRatings})</span>
                    ) : null}
                  </div>

                  <div className="browse-courses__stats-row">
                    <span>
                      <Play className="h-3 w-3" />
                      {lessonCount} {labels.lessons || 'lessons'}
                    </span>
                    <span>
                      <Clock className="h-3 w-3" />
                      {durationMin} {labels.duration || 'min'}
                    </span>
                    {(course.totalStudents || 0) > 0 ? (
                      <span>
                        <Users className="h-3 w-3" />
                        {course.totalStudents}
                      </span>
                    ) : null}
                  </div>

                  <div className="browse-courses__tags">
                    <span className="browse-courses__tag">{course.level}</span>
                    <span className="browse-courses__tag">{course.category}</span>
                  </div>

                  <div className="browse-courses__footer">
                    <span
                      className={`browse-courses__price ${isFree ? 'browse-courses__price--free' : ''}`}
                    >
                      {isFree ? 'Free' : `${course.currency || 'USD'} ${course.price}`}
                    </span>
                    <div
                      className="browse-courses__actions"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {isEnrolled ? (
                        <button
                          type="button"
                          className="browse-courses__btn browse-courses__btn--primary"
                          onClick={() => openCourse(course._id)}
                        >
                          {labels.continueLearning || 'Continue'}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="browse-courses__btn browse-courses__btn--ghost"
                            onClick={() => openCourse(course._id)}
                          >
                            {labels.viewCourse || 'Preview'}
                          </button>
                          <button
                            type="button"
                            className="browse-courses__btn browse-courses__btn--primary"
                            onClick={() => onEnroll(course._id)}
                          >
                            {labels.enroll || 'Enroll'}
                          </button>
                        </>
                      )}
                    </div>
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
