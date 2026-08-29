'use client';

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  BookOpen,
  Download,
  Eye,
  Grid3X3,
  List,
  Search,
  X,
} from 'lucide-react';
import { AdminEmptyState } from '../../admin/components/AdminUI';
import { env } from '../../../lib/env';
import './student-certs.css';

export interface EarnedCertificate {
  id?: string;
  certificateId: string;
  courseTitle: string;
  studentName?: string;
  instructorName?: string;
  completionPercentage?: number;
  completionDate: string;
  validUntil?: string;
  course?: { id?: string; _id?: string };
}

export interface AssignedCertificate {
  _id: string;
  status?: string;
  assignedDate?: string;
  dueDate?: string;
  completedAt?: string;
  teacherCertificateId?: {
    name?: string;
    issuer?: string;
    certificateUrl?: string;
  };
}

interface StudentCertificatesProps {
  certificates: EarnedCertificate[];
  assignedCertificates?: AssignedCertificate[];
  loading?: boolean;
  onView: (certificate: EarnedCertificate) => void;
  onDownload: (certificateId: string, courseTitle: string) => void;
  onStartLearning?: () => void;
  selectedCertificate?: EarnedCertificate | null;
  showModal?: boolean;
  onCloseModal?: () => void;
}

type FilterTab = 'all' | 'earned' | 'assigned';
type ViewMode = 'card' | 'list';

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function statusClass(status?: string) {
  if (status === 'completed') return 'student-certs__status--completed';
  if (status === 'viewed') return 'student-certs__status--viewed';
  if (status === 'assigned') return 'student-certs__status--assigned';
  if (status === 'expired') return 'student-certs__status--expired';
  return 'student-certs__status--default';
}

function resolveAssetUrl(url: string) {
  if (url.startsWith('http')) return url;
  return `${env.API_BASE_URL.replace('/api', '')}${url}`;
}

export default function StudentCertificates({
  certificates,
  assignedCertificates = [],
  loading = false,
  onView,
  onDownload,
  onStartLearning,
  selectedCertificate = null,
  showModal = false,
  onCloseModal,
}: StudentCertificatesProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  const assigned = useMemo(
    () => assignedCertificates.filter((a) => a.teacherCertificateId),
    [assignedCertificates]
  );

  const earnedFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter(
      (c) =>
        c.courseTitle?.toLowerCase().includes(q) ||
        c.certificateId?.toLowerCase().includes(q) ||
        c.instructorName?.toLowerCase().includes(q)
    );
  }, [certificates, search]);

  const assignedFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assigned;
    return assigned.filter(
      (a) =>
        a.teacherCertificateId?.name?.toLowerCase().includes(q) ||
        a.teacherCertificateId?.issuer?.toLowerCase().includes(q)
    );
  }, [assigned, search]);

  const showEarned = filter === 'all' || filter === 'earned';
  const showAssigned = filter === 'all' || filter === 'assigned';
  const visibleEarned = showEarned ? earnedFiltered : [];
  const visibleAssigned = showAssigned ? assignedFiltered : [];
  const totalVisible = visibleEarned.length + visibleAssigned.length;

  const openAssigned = (url?: string) => {
    if (!url) return;
    window.open(resolveAssetUrl(url), '_blank');
  };

  const downloadAssigned = (assignment: AssignedCertificate) => {
    const url = assignment.teacherCertificateId?.certificateUrl;
    if (!url) return;
    const link = document.createElement('a');
    link.href = resolveAssetUrl(url);
    link.download = assignment.teacherCertificateId?.name || 'certificate.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="student-certs__loading">
        <div className="student-certs__spinner" />
        <p className="text-sm font-medium text-[var(--admin-muted)]">Loading certificates…</p>
      </div>
    );
  }

  return (
    <div className="student-certs">
      <div className="student-certs__hero">
        <div className="student-certs__hero-inner">
          <div>
            <h2>Your credentials</h2>
            <p>
              Certificates earned from completed courses and credentials assigned by your instructors.
            </p>
          </div>
          <div className="student-certs__stats">
            <div className="student-certs__stat">
              <strong>{certificates.length}</strong>
              <span>Earned</span>
            </div>
            <div className="student-certs__stat">
              <strong>{assigned.length}</strong>
              <span>Assigned</span>
            </div>
          </div>
        </div>
      </div>

      <div className="student-certs__toolbar">
        <div className="student-certs__search">
          <Search className="student-certs__search-icon h-4 w-4" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search certificates…"
            aria-label="Search certificates"
          />
        </div>
        <div className="student-certs__toolbar-right">
          {(
            [
              ['all', `All (${certificates.length + assigned.length})`],
              ['earned', `Earned (${certificates.length})`],
              ['assigned', `Assigned (${assigned.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`student-certs__pill ${filter === id ? 'is-active' : ''}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
          <div className="student-certs__view-toggle">
            <button
              type="button"
              className={viewMode === 'card' ? 'is-active' : ''}
              onClick={() => setViewMode('card')}
              aria-label="Card view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'is-active' : ''}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="student-certs__meta">
        <strong>{totalVisible}</strong> certificate{totalVisible === 1 ? '' : 's'}
        {search ? ` matching “${search}”` : ''}
      </p>

      {totalVisible === 0 ? (
        <AdminEmptyState
          icon={Award}
          title="No certificates yet"
          description="Complete courses to 90% or more to earn certificates automatically, or wait for instructor-assigned credentials."
          action={
            onStartLearning ? (
              <button type="button" className="student-certs__btn student-certs__btn--primary" onClick={onStartLearning}>
                Start learning
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className={`student-certs__grid ${viewMode === 'list' ? 'is-list' : ''}`}>
          {visibleEarned.map((certificate) => {
            const courseId = certificate.course?.id || certificate.course?._id;
            return (
              <article
                key={certificate.id || certificate.certificateId}
                className={`student-certs__card ${viewMode === 'list' ? 'is-list' : ''}`}
              >
                <div className="student-certs__ribbon">
                  <span className="student-certs__ribbon-icon">
                    <Award className="h-4 w-4" />
                  </span>
                  <span className="student-certs__ribbon-label">Course certificate</span>
                  <h3 className="student-certs__ribbon-title">{certificate.courseTitle}</h3>
                </div>
                <div className="student-certs__body">
                  <p className="student-certs__id">#{certificate.certificateId}</p>
                  <div className="student-certs__facts">
                    <div className="student-certs__fact">
                      <span>Completion</span>
                      <strong className="is-pct">{certificate.completionPercentage ?? '—'}%</strong>
                    </div>
                    <div className="student-certs__fact">
                      <span>Instructor</span>
                      <strong>{certificate.instructorName || '—'}</strong>
                    </div>
                    <div className="student-certs__fact">
                      <span>Issued</span>
                      <strong>{formatDate(certificate.completionDate)}</strong>
                    </div>
                    <div className="student-certs__fact">
                      <span>Valid until</span>
                      <strong>{formatDate(certificate.validUntil)}</strong>
                    </div>
                  </div>
                  <div className="student-certs__actions">
                    <button
                      type="button"
                      className="student-certs__btn student-certs__btn--primary"
                      onClick={() => onView(certificate)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      className="student-certs__btn student-certs__btn--secondary"
                      onClick={() => onDownload(certificate.certificateId, certificate.courseTitle)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                    {courseId ? (
                      <button
                        type="button"
                        className="student-certs__btn student-certs__btn--ghost"
                        onClick={() => window.open(`/course/${courseId}`, '_blank')}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Course
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}

          {visibleAssigned.map((assignment) => (
            <article
              key={`assigned-${assignment._id}`}
              className={`student-certs__card ${viewMode === 'list' ? 'is-list' : ''}`}
            >
              <div className="student-certs__ribbon student-certs__ribbon--assigned">
                <span className="student-certs__ribbon-icon">
                  <Award className="h-4 w-4" />
                </span>
                <span className="student-certs__ribbon-label">Assigned credential</span>
                <h3 className="student-certs__ribbon-title">
                  {assignment.teacherCertificateId?.name || 'Assigned certificate'}
                </h3>
              </div>
              <div className="student-certs__body">
                <p className="student-certs__id">
                  Issuer: {assignment.teacherCertificateId?.issuer || '—'}
                </p>
                <div className="student-certs__facts">
                  <div className="student-certs__fact">
                    <span>Assigned</span>
                    <strong>{formatDate(assignment.assignedDate)}</strong>
                  </div>
                  <div className="student-certs__fact">
                    <span>Due</span>
                    <strong>{formatDate(assignment.dueDate)}</strong>
                  </div>
                  <div className="student-certs__fact">
                    <span>Completed</span>
                    <strong>{formatDate(assignment.completedAt)}</strong>
                  </div>
                  <div className="student-certs__fact">
                    <span>Status</span>
                    <strong>
                      <span className={`student-certs__status ${statusClass(assignment.status)}`}>
                        {assignment.status || 'assigned'}
                      </span>
                    </strong>
                  </div>
                </div>
                <div className="student-certs__actions">
                  {assignment.teacherCertificateId?.certificateUrl ? (
                    <>
                      <button
                        type="button"
                        className="student-certs__btn student-certs__btn--primary"
                        onClick={() => openAssigned(assignment.teacherCertificateId?.certificateUrl)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                      <button
                        type="button"
                        className="student-certs__btn student-certs__btn--secondary"
                        onClick={() => downloadAssigned(assignment)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-[var(--admin-muted)]">No file attached</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && selectedCertificate && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="student-certs-modal"
              onClick={(e) => e.target === e.currentTarget && onCloseModal?.()}
            >
              <div className="student-certs-modal__panel" role="dialog" aria-modal="true">
                <div className="student-certs-modal__head">
                  <h3>Certificate details</h3>
                  <button
                    type="button"
                    className="student-certs-modal__close"
                    onClick={onCloseModal}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="student-certs-modal__body">
                  <div className="student-certs-preview">
                    <div className="student-certs-preview__sheet">
                      <h1>CERTIFICATE</h1>
                      <h2>OF COMPLETION</h2>
                      <p className="cert-intro">THIS IS TO CERTIFY THAT</p>
                      <p className="cert-name">{selectedCertificate.studentName || 'Student'}</p>
                      <p className="cert-body">
                        has completed the {selectedCertificate.courseTitle} with distinction,
                        exhibiting outstanding mastery of the Navigator strategy and a remarkable
                        commitment to trading excellence.
                      </p>
                      <div className="student-certs-preview__footer">
                        <div>
                          <div className="line" />
                          <p>{selectedCertificate.instructorName || 'Instructor'}</p>
                        </div>
                        <div>
                          <p>Date</p>
                          <div className="line" />
                          <p>{formatDate(selectedCertificate.completionDate)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="student-certs-modal__info">
                    <h4>Certificate information</h4>
                    <div className="student-certs-modal__info-grid">
                      <div>
                        <label>Student</label>
                        <p>{selectedCertificate.studentName || '—'}</p>
                      </div>
                      <div>
                        <label>Course</label>
                        <p>{selectedCertificate.courseTitle}</p>
                      </div>
                      <div>
                        <label>Completion date</label>
                        <p>{formatDate(selectedCertificate.completionDate)}</p>
                      </div>
                      <div>
                        <label>Completion rate</label>
                        <p>{selectedCertificate.completionPercentage ?? '—'}%</p>
                      </div>
                      <div>
                        <label>Instructor</label>
                        <p>{selectedCertificate.instructorName || '—'}</p>
                      </div>
                      <div>
                        <label>Valid until</label>
                        <p>{formatDate(selectedCertificate.validUntil)}</p>
                      </div>
                    </div>
                    <div className="student-certs-modal__id">#{selectedCertificate.certificateId}</div>
                  </div>

                  <div className="student-certs-modal__actions">
                    <button
                      type="button"
                      className="student-certs__btn student-certs__btn--primary"
                      onClick={() =>
                        onDownload(selectedCertificate.certificateId, selectedCertificate.courseTitle)
                      }
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                    <button
                      type="button"
                      className="student-certs__btn student-certs__btn--ghost"
                      onClick={onCloseModal}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
