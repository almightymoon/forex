'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  Download,
  Eye,
  Calendar,
  Target,
  BookOpen,
  RefreshCw,
  XCircle,
  Plus,
  Edit3,
  Trash2,
  Star,
  Award,
  BarChart3,
  Users,
  TrendingUp
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { useLanguage } from '../../../context/LanguageContext';
import { buildApiUrl } from '../../../utils/api';
import AssignmentSubmissionEditor, {
  countWords,
  countCharacters,
  htmlToPlainText,
  AssignmentSubmitPortal,
} from './AssignmentSubmissionEditor';
import './student-assignments.css';

interface Assignment {
  _id: string;
  title: string;
  description: string;
  courseId?: string;
  courseTitle?: string;
  dueDate: string;
  maxPoints: number;
  passingScore: number;
  assignmentType: 'essay' | 'quiz' | 'project' | 'presentation' | 'analysis' | 'other';
  instructions?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime?: number;
  isPublished: boolean;
  allowLateSubmission: boolean;
  latePenalty: number;
  tags?: string[];
  status?: 'pending' | 'submitted' | 'graded' | 'late' | 'overdue' | 'due-today' | 'due-soon';
  submission?: {
    submittedAt: string;
    files?: Array<{
      title: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }>;
    textContent?: string;
    status: string;
  };
  grade?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
  isOverdue?: boolean;
  daysUntilDue?: number;
}

interface StudentAssignmentsProps {
  userId: string;
}

export default function StudentAssignments({ userId }: StudentAssignmentsProps) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  
  // Safety check for t function
  const safeT = (key: string) => {
    try {
      return t(key);
    } catch (error) {
      console.warn('Translation function not ready:', error);
      return key;
    }
  };
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAttachPanel, setShowAttachPanel] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'submission' | 'feedback'>('overview');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    textContent: '',
    files: [] as File[]
  });
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!showSubmitModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showSubmitModal]);

  // Rich text editor state
  const [isRichTextMode, setIsRichTextMode] = useState(false);

  useEffect(() => {
    if (hasFetchedRef.current) return; // Prevent dev-mode double mount causing repeated refreshes
    hasFetchedRef.current = true;
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Please log in to view assignments', 'error');
      return;
    }
    
    fetchAssignments();
    
    // DISABLED: Auto-refresh was causing form interruption
    // Users can manually refresh using the refresh buttons when needed
    // const interval = setInterval(() => {
    //   fetchAssignments();
    // }, 10000); // 10 seconds
    
    // return () => clearInterval(interval);
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      // Force re-render when language changes
      setAssignments([...assignments]);
    };
    
    window.addEventListener('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, [assignments]);

  const fetchAssignments = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      console.log('Token from localStorage:', token);
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20));
      
      // Check if token might be wrapped in quotes
      let cleanToken = token;
      if (token.startsWith('"') && token.endsWith('"')) {
        cleanToken = token.slice(1, -1);
        console.log('Token was wrapped in quotes, cleaned:', cleanToken.substring(0, 20));
      }
      
      // Try to decode the token to see if it's valid
      try {
        const tokenParts = cleanToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Token payload:', payload);
        }
      } catch (e) {
        console.log('Could not decode token payload:', e);
      }

                      const response = await fetch(buildApiUrl(`api/assignments?t=${Date.now()}`), {
                  headers: {
                    'Authorization': `Bearer ${cleanToken}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                  }
                });

      if (response.ok) {
        const data = await response.json();
        console.log('Assignments data received:', data);
        console.log('Sample assignment data:', data[0]);
        console.log('Sample assignment submission:', data[0]?.submission);
        console.log('Sample assignment grade:', data[0]?.grade);
        
        if (!Array.isArray(data)) {
          console.error('Invalid data format received:', typeof data, data);
          showToast('Invalid data format received from server', 'error');
          return;
        }
        
        // Process assignments to add computed fields
        const processedAssignments = data.map((assignment: any) => {
          const dueDate = new Date(assignment.dueDate);
          const now = new Date();
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isOverdue = dueDate < now && !assignment.submission;
          
          return {
            ...assignment,
            isOverdue,
            daysUntilDue,
            status: getAssignmentStatus(assignment, isOverdue, daysUntilDue)
          } as Assignment;
        });
        
        console.log('Processed assignments:', processedAssignments);
        setAssignments(processedAssignments);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('API response error:', response.status, errorData);
        showToast(`Failed to fetch assignments: ${response.status} ${errorData.error || errorData.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      showToast('Error fetching assignments', 'error');
      
      // No fallback data - show error message
      showToast('No assignments found. Please check your course enrollment.', 'info');
      setAssignments([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getAssignmentStatus = (assignment: Assignment, isOverdue: boolean, daysUntilDue: number): string => {
    // Check if assignment has been graded
    if (assignment.grade !== undefined && assignment.grade !== null) return 'graded';
    // Treat any existing submission as submitted (disable further submissions)
    if (assignment.submission) return 'submitted';
    // Check if overdue
    if (isOverdue) return 'overdue';
    // Check due dates
    if (daysUntilDue <= 0) return 'due-today';
    if (daysUntilDue <= 3) return 'due-soon';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'due-today': return 'bg-orange-100 text-orange-800';
      case 'due-soon': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded': return <CheckCircle className="w-4 h-4" />;
      case 'submitted': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      case 'due-today': return <AlertCircle className="w-4 h-4" />;
      case 'due-soon': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-orange-100 text-orange-800';
      case 'expert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return;

    // Validate that submission has content
    const plainText = htmlToPlainText(submissionForm.textContent);
    if (!plainText && submissionForm.files.length === 0) {
      showToast('Please provide an answer or attach files before submitting', 'error');
      return;
    }

    setIsSubmitting(true);

    // Debug logging
    console.log('Submitting assignment with data:', {
      textContent: submissionForm.textContent,
      textContentLength: submissionForm.textContent.length,
      textContentTrimmed: submissionForm.textContent.trim(),
      files: submissionForm.files,
      filesCount: submissionForm.files.length
    });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      // Create FormData for file uploads
      const formData = new FormData();
      formData.append('textContent', submissionForm.textContent);
      
      submissionForm.files.forEach((file, index) => {
        formData.append(`files`, file);
      });

      // Log what's being sent
      console.log('FormData contents:');
      formData.forEach((value, key) => {
        console.log(`${key}:`, value);
      });

      const response = await fetch(buildApiUrl(`api/assignments/${selectedAssignment._id}/submit`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        showToast('Assignment submitted successfully!', 'success');
        setShowSubmitModal(false);
        setSubmissionForm({ textContent: '', files: [] });
        // Optimistically update local state for immediate UI feedback
        setAssignments(prev => prev.map(a => a._id === selectedAssignment._id ? {
          ...a,
          submission: result?.submission || {
            submittedAt: new Date().toISOString(),
            textContent: submissionForm.textContent,
            files: submissionForm.files.map(f => ({ title: f.name, fileUrl: '', fileType: f.type, fileSize: f.size })),
            status: 'submitted'
          },
          status: 'submitted'
        } : a));
        setSelectedAssignment(prev => prev ? {
          ...prev,
          submission: result?.submission || {
            submittedAt: new Date().toISOString(),
            textContent: submissionForm.textContent,
            files: submissionForm.files.map(f => ({ title: f.name, fileUrl: '', fileType: f.type, fileSize: f.size })),
            status: 'submitted'
          }
        } : prev);
        fetchAssignments(); // Refresh assignments from server
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to submit assignment', 'error');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      showToast('Error submitting assignment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSubmissionForm(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const removeFile = (index: number) => {
    setSubmissionForm(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const openSubmitModal = (assignment: Assignment) => {
    // Check if student already submitted this assignment
    if (assignment.submission) {
      showToast('You have already submitted this assignment', 'error');
      return;
    }
    
    setSelectedAssignment(assignment);
    setSubmissionForm({ textContent: '', files: [] });
    setShowAttachPanel(false);
    setShowSubmitModal(true);
  };

  const openAssignmentModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setDetailTab('overview');
    setShowAssignmentModal(true);
  };

  const getDisplayStatus = (assignment: Assignment): string => {
    if (assignment.grade !== undefined && assignment.grade !== null) return 'graded';
    if (assignment.submission) return 'submitted';
    if (assignment.isOverdue || (assignment.daysUntilDue !== undefined && assignment.daysUntilDue < 0)) return 'overdue';
    if (assignment.daysUntilDue === 0) return 'due-today';
    if (assignment.daysUntilDue !== undefined && assignment.daysUntilDue <= 3) return 'due-soon';
    return assignment.status || 'pending';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'graded': return 'Graded';
      case 'submitted': return 'Submitted';
      case 'overdue': return 'Overdue';
      case 'due-today': return 'Due Today';
      case 'due-soon': return 'Due Soon';
      default: return 'To Do';
    }
  };

  const getGradeClass = (grade: number) => {
    if (grade >= 90) return 'assignments-grade--a';
    if (grade >= 80) return 'assignments-grade--b';
    if (grade >= 70) return 'assignments-grade--c';
    return 'assignments-grade--f';
  };

  const FILTER_CHIPS = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'To Do' },
    { id: 'due-soon', label: 'Due Soon' },
    { id: 'submitted', label: 'Submitted' },
    { id: 'graded', label: 'Graded' },
    { id: 'overdue', label: 'Overdue' },
  ] as const;

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (assignment.courseTitle && assignment.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === 'all' || assignment.status === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getStats = () => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'graded').length;
    const submitted = assignments.filter(a => a.status === 'submitted').length;
    const overdue = assignments.filter(a => a.status === 'overdue').length;
    const averageGrade = assignments
      .filter(a => a.grade !== undefined)
      .reduce((sum, a) => sum + (a.grade || 0), 0) / Math.max(completed, 1);

    return { total, completed, submitted, overdue, averageGrade: Math.round(averageGrade) };
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="assignments-page flex items-center justify-center min-h-[16rem]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading assignments…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="assignments-page">

      {/* Hero */}
      <section className="assignments-hero">
        <div className="assignments-hero__glow" aria-hidden />
        <div className="assignments-hero__inner">
          <div>
            <p className="assignments-hero__eyebrow">Coursework</p>
            <h2 className="assignments-hero__title">My Assignments</h2>
            <p className="assignments-hero__sub">Track deadlines, submit work, and review grades</p>
            <div className="assignments-hero__actions" style={{ marginTop: '0.85rem' }}>
              <button
                type="button"
                onClick={() => fetchAssignments(false)}
                disabled={isRefreshing}
                className="assignments-btn assignments-btn--ghost"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => fetchAssignments(false)}
                disabled={isRefreshing}
                className="assignments-btn assignments-btn--primary"
                title="Check for new grades and feedback"
              >
                <Award className="w-4 h-4" />
                Check Grades
              </button>
            </div>
          </div>
          <div className="assignments-hero__stats">
            <div className="assignments-hero__stat">
              <span className="assignments-hero__stat-val">{stats.total}</span>
              <span className="assignments-hero__stat-lbl">Total</span>
            </div>
            <div className="assignments-hero__stat">
              <span className="assignments-hero__stat-val">{stats.completed}</span>
              <span className="assignments-hero__stat-lbl">Graded</span>
            </div>
            <div className="assignments-hero__stat">
              <span className="assignments-hero__stat-val">{stats.submitted}</span>
              <span className="assignments-hero__stat-lbl">Submitted</span>
            </div>
            <div className="assignments-hero__stat">
              <span className="assignments-hero__stat-val">{stats.averageGrade}%</span>
              <span className="assignments-hero__stat-lbl">Avg</span>
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="assignments-toolbar">
        <div className="assignments-search">
          <FileText className="assignments-search__icon" />
          <input
            type="text"
            className="assignments-search__input"
            placeholder="Search by title, course, or description…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="assignments-filters">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`assignments-filter-chip${selectedFilter === chip.id ? ' is-active' : ''}`}
              onClick={() => setSelectedFilter(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment cards */}
      {filteredAssignments.length === 0 ? (
        <div className="assignments-empty">
          <FileText className="assignments-empty__icon" />
          <h3 className="assignments-empty__title">No assignments found</h3>
          <p className="assignments-empty__hint">
            {searchTerm || selectedFilter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Complete course modules to unlock assignments.'}
          </p>
        </div>
      ) : (
        <div className="assignments-list">
          {filteredAssignments.map((assignment, index) => {
            const status = getDisplayStatus(assignment);
            const hasSubmission = !!assignment.submission;
            const dueClass =
              status === 'overdue' ? 'assignments-card__due--urgent'
              : status === 'due-today' || status === 'due-soon' ? 'assignments-card__due--soon'
              : 'assignments-card__due--ok';

            return (
              <motion.article
                key={assignment._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="assignments-card"
                onClick={() => openAssignmentModal(assignment)}
              >
                <div className={`assignments-card__accent assignments-card__accent--${status}`} />
                <div className="assignments-card__body">
                  <div className="assignments-card__top">
                    <h3 className="assignments-card__title">{assignment.title}</h3>
                    <span className={`assignments-badge assignments-badge--${status}`}>
                      {getStatusIcon(status)}
                      {getStatusLabel(status)}
                    </span>
                  </div>
                  <div className="assignments-card__course">
                    <BookOpen className="w-3.5 h-3.5" />
                    {assignment.courseTitle || 'Unknown Course'}
                  </div>
                  <div className="assignments-card__meta">
                    <span className={dueClass}>
                      <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                      Due {new Date(assignment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {assignment.daysUntilDue !== undefined && status !== 'graded' && status !== 'submitted' && (
                        <span className="ml-1">
                          · {assignment.daysUntilDue < 0
                            ? `${Math.abs(assignment.daysUntilDue)}d overdue`
                            : assignment.daysUntilDue === 0
                            ? 'today'
                            : `${assignment.daysUntilDue}d left`}
                        </span>
                      )}
                    </span>
                    <span>{assignment.maxPoints} pts</span>
                    <span className={`assignments-badge assignments-badge--diff-${assignment.difficulty}`}>
                      {assignment.difficulty}
                    </span>
                    {assignment.estimatedTime ? <span>~{assignment.estimatedTime} min</span> : null}
                  </div>
                </div>
                <div className="assignments-card__actions" onClick={(e) => e.stopPropagation()}>
                  {assignment.grade !== undefined && assignment.grade !== null ? (
                    <span className={`assignments-grade ${getGradeClass(assignment.grade)}`}>
                      {assignment.grade}%
                    </span>
                  ) : assignment.submission ? (
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Pending grade</span>
                  ) : null}
                  <button
                    type="button"
                    className="assignments-card-btn assignments-card-btn--view"
                    onClick={() => openAssignmentModal(assignment)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                  {hasSubmission ? (
                    <span className="assignments-card-btn assignments-card-btn--done">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Submitted
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="assignments-card-btn assignments-card-btn--submit"
                      onClick={() => openSubmitModal(assignment)}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Submit
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Full-screen submit workspace (ported to body so it covers the shell) */}
      {showSubmitModal && selectedAssignment && (
        <AssignmentSubmitPortal>
          <div className="assignments-submit-overlay" role="dialog" aria-modal="true">
            <header className="assignments-submit-header">
              <div className="min-w-0">
                <h2 className="assignments-submit-header__title">{selectedAssignment.title}</h2>
                <p className="assignments-submit-header__meta">
                  {selectedAssignment.courseTitle} · Due{' '}
                  {new Date(selectedAssignment.dueDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  · {selectedAssignment.maxPoints} pts
                </p>
              </div>
              <button
                type="button"
                className="assignments-modal__close"
                onClick={() => setShowSubmitModal(false)}
                aria-label="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </header>

            <div className="assignments-submit-layout">
              <aside className="assignments-submit-sidebar">
                <div className="assignments-submit-tip">
                  <Edit3 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Use the <strong>formatting toolbar</strong> above the text box for bold, lists, headings, and links. Your work saves when you submit.
                  </span>
                </div>

                <div className="assignments-meta-grid" style={{ marginBottom: '1rem' }}>
                  <div className="assignments-meta-item">
                    <div className="assignments-meta-item__label">Type</div>
                    <div className="assignments-meta-item__value capitalize">{selectedAssignment.assignmentType}</div>
                  </div>
                  <div className="assignments-meta-item">
                    <div className="assignments-meta-item__label">Difficulty</div>
                    <div className="assignments-meta-item__value capitalize">{selectedAssignment.difficulty}</div>
                  </div>
                </div>

                {selectedAssignment.instructions ? (
                  <>
                    <p className="assignments-section-title">Instructions</p>
                    <div className="assignments-instructions">{selectedAssignment.instructions}</div>
                  </>
                ) : (
                  <>
                    <p className="assignments-section-title">Description</p>
                    <p className="assignments-prose">{selectedAssignment.description}</p>
                  </>
                )}
              </aside>

              <div className="assignments-submit-main">
                <div className="assignments-submit-editor-wrap">
                  <div className="assignments-submit-editor-label">
                    <span>Your response <span style={{ color: '#dc2626' }}>*</span></span>
                    <small>
                      {countWords(submissionForm.textContent)} words · {countCharacters(submissionForm.textContent)} chars
                    </small>
                  </div>
                  <AssignmentSubmissionEditor
                    value={submissionForm.textContent}
                    onChange={(html) => setSubmissionForm({ ...submissionForm, textContent: html })}
                    placeholder="Write your answer here. Use the toolbar to format text."
                  />
                </div>
              </div>
            </div>

            {showAttachPanel && (
              <div className="assignments-submit-attach-panel">
                <label className="assignments-form-label">Attachments (optional)</label>
                <div className="assignments-dropzone">
                  <Upload className="mx-auto w-10 h-10 text-slate-400 mb-2" />
                  <label htmlFor="assignment-file-upload" className="assignments-modal-btn assignments-modal-btn--primary cursor-pointer">
                    Choose files
                  </label>
                  <input id="assignment-file-upload" type="file" multiple onChange={handleFileUpload} className="hidden" />
                  <p className="assignments-form-hint">PDF, images, or documents related to your submission</p>
                </div>
                {submissionForm.files.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {submissionForm.files.map((file, idx) => (
                      <div key={idx} className="assignments-file-item">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-slate-500 shrink-0">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <footer className="assignments-submit-footer">
              <div className="assignments-submit-footer__left">
                <button
                  type="button"
                  className="assignments-submit-attach-toggle"
                  onClick={() => setShowAttachPanel((v) => !v)}
                >
                  <Upload className="w-4 h-4" />
                  Attachments
                  {submissionForm.files.length > 0 ? ` (${submissionForm.files.length})` : ''}
                </button>
                <span className="text-xs text-slate-500">
                  {countWords(submissionForm.textContent)} words
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="assignments-modal-btn assignments-modal-btn--secondary"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="assignments-modal-btn assignments-modal-btn--primary"
                  onClick={handleSubmitAssignment}
                  disabled={
                    (!htmlToPlainText(submissionForm.textContent) && submissionForm.files.length === 0) || isSubmitting
                  }
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Submit assignment
                    </>
                  )}
                </button>
              </div>
            </footer>
          </div>
        </AssignmentSubmitPortal>
      )}

      {/* Detail slide-over with tabs */}
      {showAssignmentModal && selectedAssignment && (
        <div className="assignments-modal-overlay" onClick={() => setShowAssignmentModal(false)}>
          <div className="assignments-modal" onClick={(e) => e.stopPropagation()}>
            <header className="assignments-modal__header">
              <div>
                <p className="assignments-modal__breadcrumb">{selectedAssignment.courseTitle}</p>
                <h3 className="assignments-modal__title">{selectedAssignment.title}</h3>
              </div>
              <button type="button" className="assignments-modal__close" onClick={() => setShowAssignmentModal(false)} aria-label="Close">
                <XCircle className="w-5 h-5" />
              </button>
            </header>
            <nav className="assignments-modal__tabs">
              {(['overview', 'submission', 'feedback'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`assignments-modal__tab${detailTab === tab ? ' is-active' : ''}`}
                  onClick={() => setDetailTab(tab)}
                >
                  {tab === 'overview' ? 'Overview' : tab === 'submission' ? 'Submission' : 'Feedback'}
                </button>
              ))}
            </nav>
            <div className="assignments-modal__body">
              {detailTab === 'overview' && (
                <>
                  <div className="assignments-meta-grid">
                    <div className="assignments-meta-item">
                      <div className="assignments-meta-item__label">Due date</div>
                      <div className="assignments-meta-item__value">
                        {new Date(selectedAssignment.dueDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="assignments-meta-item">
                      <div className="assignments-meta-item__label">Points</div>
                      <div className="assignments-meta-item__value">{selectedAssignment.maxPoints}</div>
                    </div>
                    <div className="assignments-meta-item">
                      <div className="assignments-meta-item__label">Type</div>
                      <div className="assignments-meta-item__value capitalize">{selectedAssignment.assignmentType}</div>
                    </div>
                    <div className="assignments-meta-item">
                      <div className="assignments-meta-item__label">Difficulty</div>
                      <div className="assignments-meta-item__value capitalize">{selectedAssignment.difficulty}</div>
                    </div>
                    <div className="assignments-meta-item">
                      <div className="assignments-meta-item__label">Est. time</div>
                      <div className="assignments-meta-item__value">
                        {selectedAssignment.estimatedTime ? `${selectedAssignment.estimatedTime} min` : 'N/A'}
                      </div>
                    </div>
                    <div className="assignments-meta-item">
                      <div className="assignments-meta-item__label">Late policy</div>
                      <div className="assignments-meta-item__value">
                        {selectedAssignment.allowLateSubmission
                          ? `Allowed (−${selectedAssignment.latePenalty}%)`
                          : 'Not allowed'}
                      </div>
                    </div>
                  </div>
                  <p className="assignments-section-title">Description</p>
                  <p className="assignments-prose" style={{ marginBottom: '1.25rem' }}>{selectedAssignment.description}</p>
                  {selectedAssignment.instructions && (
                    <>
                      <p className="assignments-section-title">Instructions</p>
                      <div className="assignments-instructions">{selectedAssignment.instructions}</div>
                    </>
                  )}
                </>
              )}

              {detailTab === 'submission' && (
                <>
                  {selectedAssignment.submission ? (
                    <div className="space-y-4">
                      <div className="assignments-meta-grid">
                        <div className="assignments-meta-item">
                          <div className="assignments-meta-item__label">Status</div>
                          <div className="assignments-meta-item__value capitalize">{selectedAssignment.submission.status}</div>
                        </div>
                        <div className="assignments-meta-item">
                          <div className="assignments-meta-item__label">Submitted</div>
                          <div className="assignments-meta-item__value" style={{ fontSize: '0.8125rem' }}>
                            {new Date(selectedAssignment.submission.submittedAt).toLocaleString()}
                          </div>
                        </div>
                        {selectedAssignment.grade !== undefined && (
                          <div className="assignments-meta-item">
                            <div className="assignments-meta-item__label">Grade</div>
                            <div className={`assignments-meta-item__value ${getGradeClass(selectedAssignment.grade)}`}>
                              {selectedAssignment.grade}%
                            </div>
                          </div>
                        )}
                      </div>
                      {selectedAssignment.submission.textContent && (
                        <>
                          <p className="assignments-section-title">Your answer</p>
                          <div
                            className="assignments-submission-box prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: selectedAssignment.submission.textContent }}
                          />
                        </>
                      )}
                      {selectedAssignment.submission.files && selectedAssignment.submission.files.length > 0 && (
                        <>
                          <p className="assignments-section-title">Attachments</p>
                          <div className="space-y-2">
                            {selectedAssignment.submission.files.map((file, idx) => (
                              <div key={idx} className="assignments-file-item">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">{file.title}</div>
                                    <div className="text-xs text-slate-500">
                                      {file.fileType} · {(file.fileSize / 1024).toFixed(1)} KB
                                    </div>
                                  </div>
                                </div>
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 shrink-0"
                                >
                                  Open
                                </a>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="assignments-no-submission">
                      <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">No submission yet</p>
                      <p className="text-sm text-slate-500 mb-4">Complete and submit before the due date</p>
                      <button
                        type="button"
                        className="assignments-modal-btn assignments-modal-btn--primary"
                        onClick={() => {
                          setShowAssignmentModal(false);
                          openSubmitModal(selectedAssignment);
                        }}
                      >
                        <Upload className="w-4 h-4" />
                        Submit now
                      </button>
                    </div>
                  )}
                </>
              )}

              {detailTab === 'feedback' && (
                <>
                  {selectedAssignment.feedback ? (
                    <div className="assignments-feedback">{selectedAssignment.feedback}</div>
                  ) : selectedAssignment.grade !== undefined ? (
                    <p className="assignments-prose text-slate-500">No written feedback yet. Check back after grading.</p>
                  ) : (
                    <div className="assignments-no-submission">
                      <Star className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="font-semibold text-slate-700 dark:text-slate-200">Feedback not available</p>
                      <p className="text-sm text-slate-500 mt-1">Instructor feedback appears here after grading</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <footer className="assignments-modal__footer">
              {!selectedAssignment.submission && (
                <button
                  type="button"
                  className="assignments-modal-btn assignments-modal-btn--primary"
                  onClick={() => {
                    setShowAssignmentModal(false);
                    openSubmitModal(selectedAssignment);
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Submit assignment
                </button>
              )}
              {selectedAssignment.submission && selectedAssignment.submission.textContent && (
                <button
                  type="button"
                  className="assignments-modal-btn assignments-modal-btn--success"
                  onClick={() => {
                    const w = window.open('', '_blank');
                    if (w) {
                      w.document.write(`<!DOCTYPE html><html><head><title>${selectedAssignment.title}</title></head><body style="font-family:system-ui;padding:2rem;max-width:720px;margin:0 auto">${selectedAssignment.submission!.textContent}</body></html>`);
                      w.document.close();
                    }
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Full view
                </button>
              )}
              <button type="button" className="assignments-modal-btn assignments-modal-btn--secondary" onClick={() => setShowAssignmentModal(false)}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
