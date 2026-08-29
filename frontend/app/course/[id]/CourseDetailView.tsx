'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Image as ImageIcon,
  Infinity,
  List,
  Play,
  Smartphone,
  Star,
  Users,
  X,
} from 'lucide-react';
import DarkModeToggle from '../../../components/DarkModeToggle';
import { getDashboardRoute, getUserRole } from '../../../utils/dashboardUtils';
import './course-detail.css';

export interface CourseContent {
  _id: string;
  title: string;
  description?: string;
  type: string;
  order?: number;
  duration?: number;
  isPreview?: boolean;
  views?: number;
  videoUrl?: string;
  thumbnail?: string;
  textContent?: string;
  assignmentType?: string;
  maxPoints?: number;
}

export interface CourseData {
  _id: string;
  title: string;
  description: string;
  teacher: {
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  price: number;
  currency: string;
  thumbnail: string;
  content: CourseContent[];
  videos: CourseContent[];
  category: string;
  level: string;
  rating: number;
  totalRatings: number;
  totalStudents: number;
  totalVideos: number;
  totalDuration: number;
  requirements: string[];
  learningOutcomes: string[];
  certificate: {
    isAvailable: boolean;
    minProgress: number;
  };
}

interface CourseDetailViewProps {
  course: CourseData;
  selectedContent: CourseContent | null;
  onSelectContent: (content: CourseContent) => void;
  isEnrolled: boolean;
  courseProgress: number;
  certificateEligible: boolean;
  assignments: Array<{
    _id: string;
    title: string;
    description?: string;
    order?: number;
    assignmentType?: string;
    maxPoints?: number;
  }>;
  getContentCompletionStatus: (content: CourseContent) => { isCompleted: boolean };
  getContentTypeStyle: (type: string) => string;
  formatDuration: (seconds: number) => string;
  renderLesson: (content: CourseContent) => React.ReactNode;
  onEnroll: () => void;
}

function lessonIcon(type: string, completed: boolean) {
  if (completed) return <CheckCircle className="h-4 w-4 text-emerald-400" />;
  if (type === 'video') return <Play className="h-3.5 w-3.5" />;
  if (type === 'image') return <ImageIcon className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

export default function CourseDetailView({
  course,
  selectedContent,
  onSelectContent,
  isEnrolled,
  courseProgress,
  certificateEligible,
  assignments,
  getContentCompletionStatus,
  getContentTypeStyle,
  formatDuration,
  renderLesson,
  onEnroll,
}: CourseDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'instructor'>('overview');
  const [mobileIndexOpen, setMobileIndexOpen] = useState(false);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  const contentList = course.content?.length ? course.content : course.videos || [];
  const lessonCount = contentList.length;
  const currentIndex = selectedContent
    ? contentList.findIndex((c) => c._id === selectedContent._id)
    : -1;
  const prevContent = currentIndex > 0 ? contentList[currentIndex - 1] : null;
  const nextContent =
    currentIndex >= 0 && currentIndex < contentList.length - 1
      ? contentList[currentIndex + 1]
      : null;

  const completedCount = contentList.filter((c) => getContentCompletionStatus(c).isCompleted).length;
  const totalLessons = contentList.length + assignments.length;
  const durationMin = Math.round((course.totalDuration || 0) / 60);
  const instructorName = `${course.teacher?.firstName || 'Unknown'} ${course.teacher?.lastName || ''}`.trim();
  const instructorInitials = `${course.teacher?.firstName?.[0] || 'T'}${course.teacher?.lastName?.[0] || ''}`;
  const selectedCompleted = selectedContent
    ? getContentCompletionStatus(selectedContent).isCompleted
    : false;

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedContent?._id]);

  const goDashboard = () => {
    const role = getUserRole();
    router.push(getDashboardRoute(role || 'student'));
  };

  const selectLesson = (item: CourseContent) => {
    onSelectContent(item);
    setMobileIndexOpen(false);
  };

  const renderIndexItem = (item: CourseContent, index: number) => {
    const { isCompleted } = getContentCompletionStatus(item);
    const isActive = selectedContent?._id === item._id;

    return (
      <button
        key={item._id}
        ref={isActive ? activeItemRef : undefined}
        type="button"
        onClick={() => selectLesson(item)}
        className={`cd-index__item ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-done' : ''}`}
      >
        <span className="cd-index__status">
          {isCompleted ? (
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          ) : (
            <span className="cd-index__num">{String(index + 1).padStart(2, '0')}</span>
          )}
        </span>
        <span className="cd-index__body">
          <span className="cd-index__title">{item.title}</span>
          <span className="cd-index__meta">
            <span className="cd-index__type">
              {lessonIcon(item.type, false)}
              {item.type}
            </span>
            {item.type === 'video' && item.duration ? (
              <span>{formatDuration(item.duration)}</span>
            ) : null}
            {item.isPreview ? <span className="cd-index__preview">Preview</span> : null}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="cd-learn">
      <header className="cd-topbar">
        <div className="cd-topbar__inner">
          <button type="button" className="cd-topbar__back" onClick={goDashboard}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="cd-topbar__course">
            {course.thumbnail ? (
              <img src={course.thumbnail} alt="" className="cd-topbar__thumb" />
            ) : (
              <span className="cd-topbar__thumb-fallback">
                <BookOpen className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="cd-topbar__eyebrow">
                {course.level} · {course.category}
              </p>
              <h1 className="cd-topbar__title">{course.title}</h1>
            </div>
          </div>

          <div className="cd-topbar__actions">
            {isEnrolled ? (
              <div className="cd-topbar__progress">
                <span className="cd-topbar__progress-label">{courseProgress}%</span>
                <span className="cd-topbar__progress-track">
                  <span style={{ width: `${courseProgress}%` }} />
                </span>
              </div>
            ) : (
              <button type="button" className="cd-topbar__enroll" onClick={onEnroll}>
                Enroll · {course.price === 0 ? 'Free' : `${course.currency} ${course.price}`}
              </button>
            )}
            <button
              type="button"
              className="cd-topbar__lessons lg:hidden"
              onClick={() => setMobileIndexOpen(true)}
            >
              <List className="h-4 w-4" />
              Index
            </button>
            <DarkModeToggle size="sm" />
          </div>
        </div>
      </header>

      <div className="cd-workspace">
        {/* LEFT: curriculum index */}
        <aside
          className={`cd-index ${mobileIndexOpen ? 'is-open' : ''}`}
          aria-label="Course content index"
        >
          <div className="cd-index__head">
            <div>
              <h2>Course content</h2>
              <p>
                {totalLessons} lessons
                {durationMin > 0 ? ` · ${durationMin} min` : ''}
                {isEnrolled ? ` · ${completedCount} done` : ''}
              </p>
            </div>
            <button
              type="button"
              className="cd-index__close lg:hidden"
              onClick={() => setMobileIndexOpen(false)}
              aria-label="Close index"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isEnrolled ? (
            <div className="cd-index__progress">
              <div className="cd-index__progress-row">
                <span>Your progress</span>
                <strong>{courseProgress}%</strong>
              </div>
              <div className="cd-index__progress-bar">
                <div style={{ width: `${courseProgress}%` }} />
              </div>
              {course.certificate?.isAvailable && certificateEligible ? (
                <button
                  type="button"
                  className="cd-index__cert"
                  onClick={() => window.open('/dashboard?tab=certificates', '_blank')}
                >
                  <Award className="h-4 w-4" />
                  Certificate ready
                </button>
              ) : null}
            </div>
          ) : (
            <div className="cd-index__enroll">
              <p>{course.price === 0 ? 'Free course' : `${course.currency} ${course.price}`}</p>
              <button type="button" onClick={onEnroll}>
                Enroll to unlock progress
              </button>
            </div>
          )}

          <div className="cd-index__list">
            <p className="cd-index__section">Lessons</p>
            {contentList.map((item, index) => renderIndexItem(item, index))}

            {assignments.length > 0 ? (
              <>
                <p className="cd-index__section">Assignments</p>
                {assignments.map((assignment, index) => {
                  const isActive = selectedContent?._id === assignment._id;
                  return (
                    <button
                      key={assignment._id}
                      type="button"
                      onClick={() =>
                        selectLesson({
                          _id: assignment._id,
                          title: assignment.title,
                          description: assignment.description,
                          type: 'assignment',
                          order: assignment.order || index + 1000,
                          assignmentType: assignment.assignmentType,
                          maxPoints: assignment.maxPoints,
                        })
                      }
                      className={`cd-index__item ${isActive ? 'is-active' : ''}`}
                    >
                      <span className="cd-index__status">
                        <span className="cd-index__num">
                          {String(contentList.length + index + 1).padStart(2, '0')}
                        </span>
                      </span>
                      <span className="cd-index__body">
                        <span className="cd-index__title">{assignment.title}</span>
                        <span className="cd-index__meta">
                          <span className="cd-index__type">
                            <FileText className="h-3.5 w-3.5" />
                            assignment
                          </span>
                          <span>{assignment.maxPoints || 'N/A'} pts</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </>
            ) : null}
          </div>
        </aside>

        {mobileIndexOpen ? (
          <button
            type="button"
            className="cd-index__backdrop lg:hidden"
            onClick={() => setMobileIndexOpen(false)}
            aria-label="Close index"
          />
        ) : null}

        {/* RIGHT: lesson stage */}
        <main className="cd-stage">
          <div className="cd-player">
            {selectedContent ? (
              <>
                <div className="cd-player__bar">
                  <div className="min-w-0 flex-1">
                    <p className="cd-player__eyebrow">
                      Lesson {currentIndex >= 0 ? currentIndex + 1 : '—'} of {lessonCount}
                      <span>·</span>
                      <span className="capitalize">{selectedContent.type}</span>
                    </p>
                    <h2 className="cd-player__title">{selectedContent.title}</h2>
                  </div>
                  {selectedCompleted ? (
                    <span className="cd-player__done">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Completed
                    </span>
                  ) : null}
                </div>

                <div
                  className={`cd-player__frame${
                    selectedContent.type !== 'video' ? ' cd-player__frame--doc' : ''
                  }`}
                >
                  {renderLesson(selectedContent)}
                </div>

                {selectedContent.description ? (
                  <p className="cd-player__desc">{selectedContent.description}</p>
                ) : null}
              </>
            ) : (
              <div className="cd-player__empty">
                <BookOpen className="h-10 w-10 opacity-40" />
                <p>Select a lesson from the index to start learning</p>
                <button
                  type="button"
                  className="cd-topbar__lessons lg:hidden"
                  onClick={() => setMobileIndexOpen(true)}
                >
                  <List className="h-4 w-4" />
                  Open course index
                </button>
              </div>
            )}
          </div>

          {contentList.length > 1 ? (
            <div className="cd-nav">
              <button
                type="button"
                className="cd-nav__btn"
                disabled={!prevContent}
                onClick={() => prevContent && selectLesson(prevContent)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="cd-nav__pos">
                {currentIndex >= 0 ? currentIndex + 1 : 0} / {lessonCount}
              </span>
              <button
                type="button"
                className="cd-nav__btn cd-nav__btn--primary"
                disabled={!nextContent}
                onClick={() => nextContent && selectLesson(nextContent)}
              >
                Next lesson
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <section className="cd-info">
            <div className="cd-info__tabs">
              <button
                type="button"
                className={activeTab === 'overview' ? 'is-active' : ''}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                type="button"
                className={activeTab === 'instructor' ? 'is-active' : ''}
                onClick={() => setActiveTab('instructor')}
              >
                Instructor
              </button>
            </div>

            <div className="cd-info__panel">
              {activeTab === 'overview' ? (
                <div className="space-y-5">
                  <div className="cd-info__stats">
                    <span>
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {(course.rating || 0).toFixed(1)}
                    </span>
                    <span>
                      <Users className="h-4 w-4" />
                      {course.totalStudents || 0} students
                    </span>
                    <span>
                      <Play className="h-4 w-4" />
                      {lessonCount} lessons
                    </span>
                    <span>
                      <Clock className="h-4 w-4" />
                      {durationMin} min
                    </span>
                  </div>

                  <div>
                    <h3>About this course</h3>
                    <p className="cd-info__text">{course.description}</p>
                  </div>

                  {course.learningOutcomes?.length > 0 ? (
                    <div>
                      <h3>What you&apos;ll learn</h3>
                      <div className="cd-info__learn">
                        {course.learningOutcomes.map((outcome, i) => (
                          <div key={i}>
                            <CheckCircle className="h-4 w-4" />
                            <span>{outcome}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {course.requirements?.length > 0 ? (
                    <div>
                      <h3>Requirements</h3>
                      <ul className="cd-info__reqs">
                        {course.requirements.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="cd-info__includes">
                    <span>
                      <Infinity className="h-4 w-4" /> Lifetime access
                    </span>
                    <span>
                      <Smartphone className="h-4 w-4" /> Mobile & desktop
                    </span>
                    <span>
                      <Award className="h-4 w-4" /> Certificate
                    </span>
                    <span>
                      <Globe className="h-4 w-4" /> English
                    </span>
                  </div>
                </div>
              ) : (
                <div className="cd-info__instructor">
                  <span className="cd-info__avatar">
                    {course.teacher?.profileImage ? (
                      <img src={course.teacher.profileImage} alt="" />
                    ) : (
                      instructorInitials
                    )}
                  </span>
                  <div>
                    <h3>{instructorName}</h3>
                    <p>
                      {course.category} · {course.level} level instructor
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
