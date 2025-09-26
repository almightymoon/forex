'use client';

import { useState, useEffect, useCallback } from 'react';

interface QuizAnswer {
  questionId: string;
  answer: string;
}

interface QuizAttempt {
  attemptNumber: number;
  answers: Array<{
    questionId: string;
    answer: string;
    isCorrect: boolean;
    pointsEarned: number;
  }>;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  attemptedAt: string;
  timeSpent: number;
}

interface UseQuizProgressOptions {
  courseId: string;
  contentId: string;
}

interface UseQuizProgressReturn {
  attempts: QuizAttempt[];
  currentAttempt: QuizAnswer[];
  isCompleted: boolean;
  bestScore: number;
  submitQuiz: (answers: QuizAnswer[], timeSpent: number) => Promise<QuizAttempt>;
  loading: boolean;
  error: string | null;
}

export const useQuizProgress = ({
  courseId,
  contentId
}: UseQuizProgressOptions): UseQuizProgressReturn => {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<QuizAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompleted = attempts.some(attempt => attempt.passed);
  const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.percentage)) : 0;

  // Load existing attempts on mount
  useEffect(() => {
    loadQuizProgress();
  }, [courseId, contentId]);

  const loadQuizProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/progress/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load quiz progress');
      }

      const data = await response.json();
      const contentProgress = data.progress.contentProgress.find(
        (cp: any) => cp.contentId === contentId
      );

      if (contentProgress && contentProgress.quizAttempts) {
        setAttempts(contentProgress.quizAttempts);
      }
    } catch (err) {
      console.error('Error loading quiz progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz progress');
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = useCallback(async (answers: QuizAnswer[], timeSpent: number): Promise<QuizAttempt> => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/progress/${courseId}/quiz/${contentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,
          timeSpent
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }

      const data = await response.json();
      const newAttempt = data.attempt;

      // Update local state
      setAttempts(prev => [...prev, newAttempt]);
      setCurrentAttempt([]);

      return newAttempt;
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [courseId, contentId]);

  const updateCurrentAttempt = useCallback((questionId: string, answer: string) => {
    setCurrentAttempt(prev => {
      const existingIndex = prev.findIndex(a => a.questionId === questionId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { questionId, answer };
        return updated;
      } else {
        return [...prev, { questionId, answer }];
      }
    });
  }, []);

  const getCurrentAnswer = useCallback((questionId: string): string | null => {
    const answer = currentAttempt.find(a => a.questionId === questionId);
    return answer ? answer.answer : null;
  }, [currentAttempt]);

  const getAttemptCount = useCallback((): number => {
    return attempts.length;
  }, [attempts]);

  const canRetake = useCallback((): boolean => {
    // Allow retakes if not passed or if no attempts yet
    return !isCompleted || attempts.length === 0;
  }, [isCompleted, attempts.length]);

  return {
    attempts,
    currentAttempt,
    isCompleted,
    bestScore,
    submitQuiz,
    updateCurrentAttempt,
    getCurrentAnswer,
    getAttemptCount,
    canRetake,
    loading,
    error
  };
};
