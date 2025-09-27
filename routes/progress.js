const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const CourseProgress = require('../models/CourseProgress');
const Course = require('../models/Course');
const User = require('../models/User');

// @route   GET /api/progress/:courseId
// @desc    Get student's progress for a specific course
// @access  Private (enrolled students)
router.get('/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId || req.user._id;

    // Verify student is enrolled in the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const enrollment = course.enrolledStudents.find(
      e => e.student.toString() === userId.toString()
    );

    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Get or create progress record
    let progress = await CourseProgress.findOne({ 
      student: userId, 
      course: courseId 
    }).populate('course', 'title description thumbnail');

    if (!progress) {
      // Initialize progress if it doesn't exist
      progress = await CourseProgress.initializeProgress(userId, courseId, course.content);
    }

    const detailedProgress = progress.getDetailedProgress();
    
    res.json({
      success: true,
      progress: detailedProgress,
      enrollment: {
        enrolledAt: enrollment.enrolledAt,
        lastAccessed: enrollment.lastAccessed
      }
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// @route   PUT /api/progress/:courseId/video/:contentId
// @desc    Update video progress
// @access  Private (enrolled students)
router.put('/:courseId/video/:contentId', authenticateToken, async (req, res) => {
  try {
    console.log('=== VIDEO PROGRESS UPDATE STARTED ===');
    const { courseId, contentId } = req.params;
    const userId = req.user.userId || req.user._id;
    const { watchedDuration, totalDuration, watchedSegments } = req.body;
    
    console.log('Request data:', {
      courseId,
      contentId,
      userId,
      watchedDuration,
      totalDuration,
      watchedSegments
    });

    if (watchedDuration === undefined || totalDuration === undefined || 
        watchedDuration === null || totalDuration === null) {
      console.log('Validation failed:', { watchedDuration, totalDuration });
      return res.status(400).json({ 
        error: 'Watched duration and total duration are required',
        received: { watchedDuration, totalDuration }
      });
    }

    // Get or create progress record
    let progress = await CourseProgress.findOne({ 
      student: userId, 
      course: courseId 
    });

    if (!progress) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      progress = await CourseProgress.initializeProgress(userId, courseId, course.content);
    }

    // Ensure contentProgress array exists
    if (!progress.contentProgress) {
      progress.contentProgress = [];
    }

    console.log('Progress record:', {
      studentId: userId,
      courseId,
      contentId,
      contentProgressLength: progress.contentProgress.length,
      watchedDuration,
      totalDuration
    });

    // Update video progress
    await progress.updateContentProgress(contentId, 'video', {
      watchedDuration,
      totalDuration,
      watchedSegments
    });

    // Check if course is completed and generate certificate
    let certificateGenerated = false;
    
    // Get course to check certificate settings
    const Course = require('../models/Course');
    const course = await Course.findById(courseId).populate('teacher', 'firstName lastName');
    
    if (course && course.certificate && course.certificate.isAvailable && 
        progress.overallProgress.percentage >= course.certificate.minProgress) {
      try {
        // Check if certificate already exists
        const Certificate = require('../models/Certificate');
        const existingCertificate = await Certificate.findOne({
          student: userId,
          course: courseId
        });

        if (!existingCertificate) {
          // Generate certificate
          const certificateService = require('../services/certificateService');
          const User = require('../models/User');

          const student = await User.findById(userId);

          if (course && student) {
            const certificateId = certificateService.generateCertificateId();
            const certificateData = {
              studentName: `${student.firstName} ${student.lastName}`,
              courseTitle: course.title,
              instructorName: `${course.teacher.firstName} ${course.teacher.lastName}`,
              completionDate: new Date(),
              completionPercentage: progress.overallProgress.percentage,
              certificateId,
              issuedBy: 'Trading Education Platform'
            };

            const { filePath, fileName, certificateUrl } = await certificateService.generateCertificate(certificateData);

            // Save certificate to database
            const certificate = new Certificate({
              student: userId,
              course: courseId,
              certificateId,
              completionDate: certificateData.completionDate,
              completionPercentage: certificateData.completionPercentage,
              studentName: certificateData.studentName,
              courseTitle: certificateData.courseTitle,
              instructorName: certificateData.instructorName,
              certificateUrl,
              issuedBy: certificateData.issuedBy
            });

            await certificate.save();
            certificateGenerated = true;
            console.log('Certificate generated successfully:', certificateId);
          }
        }
      } catch (certError) {
        console.error('Certificate generation error:', certError);
        // Don't fail the progress update if certificate generation fails
      }
    }

    res.json({
      success: true,
      message: 'Video progress updated',
      progress: progress.overallProgress,
      certificateGenerated
    });

  } catch (error) {
    console.error('Update video progress error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      courseId,
      contentId,
      userId,
      watchedDuration,
      totalDuration
    });
    res.status(500).json({ 
      error: 'Failed to update video progress',
      details: error.message 
    });
  }
});

// @route   DELETE /api/progress/:courseId/video/:contentId/reset
// @desc    Reset video progress (for testing)
// @access  Private (enrolled students)
router.delete('/:courseId/video/:contentId/reset', authenticateToken, async (req, res) => {
  try {
    console.log('=== RESET VIDEO PROGRESS STARTED ===');
    const { courseId, contentId } = req.params;
    const userId = req.user.userId || req.user._id;
    
    console.log('Reset request data:', {
      courseId,
      contentId,
      userId
    });

    // Find the progress record
    const progress = await CourseProgress.findOne({ 
      student: userId, 
      course: courseId 
    });

    if (!progress) {
      return res.status(404).json({ 
        error: 'Progress record not found',
        message: 'No progress record found for this course'
      });
    }

    // Find the content progress
    const contentProgress = progress.contentProgress.find(
      cp => cp.contentId.toString() === contentId.toString()
    );

    if (!contentProgress) {
      return res.status(404).json({ 
        error: 'Content progress not found',
        message: 'No progress found for this video'
      });
    }

    // Reset the video progress
    contentProgress.videoProgress = {
      watchedDuration: 0,
      totalDuration: 0,
      watchPercentage: 0,
      watchedSegments: [],
      lastWatchedAt: null
    };
    contentProgress.isCompleted = false;
    contentProgress.completedAt = null;

    // Recalculate overall progress
    await progress.calculateOverallProgress();
    await progress.save();

    console.log('Video progress reset successfully');

    res.json({
      success: true,
      message: 'Video progress reset successfully',
      progress: progress.overallProgress
    });

  } catch (error) {
    console.error('Reset video progress error:', error);
    res.status(500).json({ 
      error: 'Failed to reset video progress',
      details: error.message 
    });
  }
});

// @route   DELETE /api/progress/:courseId/reset-all
// @desc    Reset all progress for a course (for testing)
// @access  Private (enrolled students)
router.delete('/:courseId/reset-all', authenticateToken, async (req, res) => {
  try {
    console.log('=== RESET ALL PROGRESS STARTED ===');
    const { courseId } = req.params;
    const userId = req.user.userId || req.user._id;
    
    console.log('Reset all request data:', {
      courseId,
      userId
    });

    // Find the progress record
    const progress = await CourseProgress.findOne({ 
      student: userId, 
      course: courseId 
    });

    if (!progress) {
      return res.status(404).json({ 
        error: 'Progress record not found',
        message: 'No progress record found for this course'
      });
    }

    // Reset all content progress
    progress.contentProgress.forEach(contentProgress => {
      // Reset video progress
      if (contentProgress.videoProgress) {
        contentProgress.videoProgress = {
          watchedDuration: 0,
          totalDuration: 0,
          watchPercentage: 0,
          watchedSegments: [],
          lastWatchedAt: null
        };
      }
      
      // Reset quiz attempts
      if (contentProgress.quizAttempts) {
        contentProgress.quizAttempts = [];
      }
      
      // Reset assignment submissions
      if (contentProgress.assignmentSubmission) {
        contentProgress.assignmentSubmission = {
          submitted: false,
          submittedAt: null,
          score: 0,
          feedback: '',
          files: []
        };
      }
      
      // Reset reading progress
      if (contentProgress.readingProgress) {
        contentProgress.readingProgress = {
          timeSpent: 0,
          isMarkedComplete: false,
          completedAt: null
        };
      }
      
      // Reset completion status
      contentProgress.isCompleted = false;
      contentProgress.completedAt = null;
    });

    // Reset overall progress
    progress.overallProgress = {
      percentage: 0,
      completedContent: 0,
      totalContent: progress.contentProgress.length,
      lastUpdated: new Date()
    };

    // Reset analytics
    progress.analytics = {
      totalStudyTime: 0,
      averageSessionDuration: 0,
      totalSessions: 0,
      lastSessionDuration: 0,
      streakDays: 0,
      lastStudyDate: null,
      studyPattern: {
        preferredDays: [],
        preferredTimes: [],
        averageDailyTime: 0
      }
    };

    await progress.save();

    console.log('All progress reset successfully');

    res.json({
      success: true,
      message: 'All progress reset successfully',
      progress: progress.overallProgress
    });

  } catch (error) {
    console.error('Reset all progress error:', error);
    res.status(500).json({ 
      error: 'Failed to reset all progress',
      details: error.message 
    });
  }
});

// @route   PUT /api/progress/:courseId/quiz/:contentId
// @desc    Record quiz attempt
// @access  Private (enrolled students)
router.put('/:courseId/quiz/:contentId', authenticateToken, async (req, res) => {
  try {
    const { courseId, contentId } = req.params;
    const userId = req.user.userId || req.user._id;
    const { answers, timeSpent } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers are required' });
    }

    // Get or create progress record
    let progress = await CourseProgress.findOne({ 
      student: userId, 
      course: courseId 
    });

    if (!progress) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      progress = await CourseProgress.initializeProgress(userId, courseId, course.content);
    }

    // Get quiz content to calculate score
    const course = await Course.findById(courseId);
    const quizContent = course.content.find(c => c._id.toString() === contentId);
    
    if (!quizContent || quizContent.type !== 'quiz') {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Calculate score
    let score = 0;
    let maxScore = 0;
    const processedAnswers = answers.map(answer => {
      const question = quizContent.quizQuestions.find(q => q._id.toString() === answer.questionId);
      if (question) {
        maxScore += question.points;
        const isCorrect = answer.answer === question.correctAnswer;
        if (isCorrect) {
          score += question.points;
        }
        return {
          questionId: answer.questionId,
          answer: answer.answer,
          isCorrect,
          pointsEarned: isCorrect ? question.points : 0
        };
      }
      return answer;
    });

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percentage >= (quizContent.passingScore || 70);

    const attempt = {
      attemptNumber: (progress.contentProgress.find(cp => cp.contentId.toString() === contentId)?.quizAttempts.length || 0) + 1,
      answers: processedAnswers,
      score,
      maxScore,
      percentage,
      passed,
      timeSpent: timeSpent || 0
    };

    // Update quiz progress
    await progress.updateContentProgress(contentId, 'quiz', { attempt });

    res.json({
      success: true,
      message: 'Quiz attempt recorded',
      attempt: {
        ...attempt,
        passed,
        percentage
      },
      progress: progress.overallProgress
    });

  } catch (error) {
    console.error('Record quiz attempt error:', error);
    res.status(500).json({ error: 'Failed to record quiz attempt' });
  }
});

// @route   PUT /api/progress/:courseId/assignment/:contentId
// @desc    Update assignment submission progress
// @access  Private (enrolled students)
router.put('/:courseId/assignment/:contentId', authenticateToken, async (req, res) => {
  try {
    const { courseId, contentId } = req.params;
    const userId = req.user.userId || req.user._id;
    const { submitted, grade, passed, feedback, gradedAt } = req.body;

    // Get or create progress record
    let progress = await CourseProgress.findOne({ 
      student: userId, 
      course: courseId 
    });

    if (!progress) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      progress = await CourseProgress.initializeProgress(userId, courseId, course.content);
    }

    const submission = {
      submitted,
      grade,
      passed,
      feedback,
      gradedAt: gradedAt ? new Date(gradedAt) : new Date()
    };

    // Update assignment progress
    await progress.updateContentProgress(contentId, 'assignment', { submission });

    res.json({
      success: true,
      message: 'Assignment progress updated',
      submission,
      progress: progress.overallProgress
    });

  } catch (error) {
    console.error('Update assignment progress error:', error);
    res.status(500).json({ error: 'Failed to update assignment progress' });
  }
});

// @route   GET /api/progress/student/overview
// @desc    Get student's progress overview for all enrolled courses
// @access  Private
router.get('/student/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    // Get all progress records for the student
    const progressRecords = await CourseProgress.find({ student: userId })
      .populate('course', 'title description thumbnail category level')
      .sort({ lastAccessed: -1 });

    // Get all courses the student is enrolled in (only published courses)
    const enrolledCourses = await Course.find({
      'enrolledStudents.student': userId,
      $or: [
        { isPublished: true },
        { status: 'published' }
      ]
    }).select('title description thumbnail category level enrolledStudents');

    // Create progress overview
    const courses = enrolledCourses.map(course => {
      const enrollment = course.enrolledStudents.find(
        e => e.student.toString() === userId.toString()
      );
      
      const progressRecord = progressRecords.find(
        p => p.course._id.toString() === course._id.toString()
      );

      const progress = progressRecord ? progressRecord.overallProgress : {
        percentage: 0,
        completedContent: 0,
        totalContent: course.content ? course.content.length : 0
      };

      return {
        courseId: course._id.toString(),
        courseTitle: course.title,
        courseThumbnail: course.thumbnail,
        category: course.category,
        level: course.level,
        progress: {
          percentage: Math.round(progress.percentage),
          completedContent: progress.completedContent,
          totalContent: progress.totalContent
        },
        certificateEligible: progressRecord ? progressRecord.certificateEligibility.isEligible : false,
        certificateIssued: progressRecord ? progressRecord.certificateEligibility.certificateIssued : false,
        lastAccessed: enrollment ? enrollment.lastAccessed : new Date(),
        enrolledAt: enrollment ? enrollment.enrolledAt : new Date()
      };
    });

    // Calculate overview statistics
    const totalCourses = courses.length;
    const completedCourses = courses.filter(c => c.progress.percentage >= 100).length;
    const inProgressCourses = courses.filter(c => c.progress.percentage > 0 && c.progress.percentage < 100).length;
    const notStartedCourses = courses.filter(c => c.progress.percentage === 0).length;
    const eligibleForCertificates = courses.filter(c => c.certificateEligible).length;
    const issuedCertificates = courses.filter(c => c.certificateIssued).length;

    const overview = {
      totalCourses,
      completedCourses,
      inProgressCourses,
      notStartedCourses,
      eligibleForCertificates,
      issuedCertificates,
      courses
    };

    res.json({
      success: true,
      overview
    });

  } catch (error) {
    console.error('Get progress overview error:', error);
    res.status(500).json({ error: 'Failed to get progress overview' });
  }
});

// @route   GET /api/progress/:courseId/certificate-eligibility
// @desc    Check certificate eligibility
// @access  Private (enrolled students)
router.get('/:courseId/certificate-eligibility', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId || req.user._id;

    // Get progress record
    const progress = await CourseProgress.findOne({ 
      student: userId, 
      course: courseId 
    }).populate('course', 'title certificate');

    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    // Check if certificate is available for this course
    if (!progress.course.certificate.isAvailable) {
      return res.json({
        success: true,
        eligible: false,
        reason: 'Certificate not available for this course'
      });
    }

    res.json({
      success: true,
      eligible: progress.certificateEligibility.isEligible,
      completionCriteria: progress.certificateEligibility.completionCriteria,
      overallProgress: progress.overallProgress,
      certificateIssued: progress.certificateEligibility.certificateIssued,
      certificateId: progress.certificateEligibility.certificateId,
      requirements: {
        minProgress: progress.course.certificate.minProgress,
        currentProgress: progress.overallProgress.percentage
      }
    });

  } catch (error) {
    console.error('Check certificate eligibility error:', error);
    res.status(500).json({ error: 'Failed to check certificate eligibility' });
  }
});

// @route   PUT /api/progress/:courseId/text/:contentId
// @desc    Update text content progress
// @access  Private (enrolled students)
router.put('/:courseId/text/:contentId', authenticateToken, async (req, res) => {
  try {
    console.log('=== TEXT PROGRESS UPDATE STARTED ===');
    const { courseId, contentId } = req.params;
    const userId = req.user.userId || req.user._id;
    const { timeSpent, readingPercentage, isCompleted, lastReadAt } = req.body;
    
    console.log('Request data:', {
      courseId,
      contentId,
      userId,
      timeSpent,
      readingPercentage,
      isCompleted,
      lastReadAt
    });

    if (timeSpent === undefined || timeSpent === null) {
      console.log('Validation failed:', { timeSpent });
      return res.status(400).json({ 
        error: 'Time spent is required',
        received: { timeSpent }
      });
    }

    // Get or create progress record
    let progress = await CourseProgress.findOne({ 
      student: userId, 
      course: courseId 
    });

    if (!progress) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      progress = await CourseProgress.initializeProgress(userId, courseId, course.content);
    }

    // Ensure contentProgress array exists
    if (!progress.contentProgress) {
      progress.contentProgress = [];
    }

    console.log('Progress record:', {
      studentId: userId,
      courseId,
      contentId,
      contentProgressLength: progress.contentProgress.length,
      timeSpent,
      readingPercentage
    });

    // Update text progress
    await progress.updateContentProgress(contentId, 'text', {
      timeSpent,
      readingPercentage,
      isCompleted,
      lastReadAt
    });

    // Check if course is completed and generate certificate
    let certificateGenerated = false;
    
    // Get course to check certificate settings
    const Course = require('../models/Course');
    const course = await Course.findById(courseId).populate('teacher', 'firstName lastName');
    
    if (course && course.certificate && course.certificate.isAvailable && 
        progress.overallProgress.percentage >= course.certificate.minProgress) {
      try {
        // Check if certificate already exists
        const Certificate = require('../models/Certificate');
        const existingCertificate = await Certificate.findOne({
          student: userId,
          course: courseId
        });

        if (!existingCertificate) {
          // Generate certificate
          const certificateService = require('../services/certificateService');
          const User = require('../models/User');

          const student = await User.findById(userId);

          if (course && student) {
            const certificateId = certificateService.generateCertificateId();
            const certificateData = {
              studentName: `${student.firstName} ${student.lastName}`,
              courseTitle: course.title,
              instructorName: `${course.teacher.firstName} ${course.teacher.lastName}`,
              completionDate: new Date(),
              completionPercentage: progress.overallProgress.percentage,
              certificateId,
              issuedBy: 'FOREX NAVIGATORS'
            };

            const { filePath, fileName, certificateUrl } = await certificateService.generateCertificate(certificateData);

            // Save certificate to database
            const certificate = new Certificate({
              student: userId,
              course: courseId,
              certificateId,
              completionDate: certificateData.completionDate,
              completionPercentage: certificateData.completionPercentage,
              studentName: certificateData.studentName,
              courseTitle: certificateData.courseTitle,
              instructorName: certificateData.instructorName,
              certificateUrl,
              issuedBy: certificateData.issuedBy
            });

            await certificate.save();
            certificateGenerated = true;
            console.log('Certificate generated successfully:', certificateId);
          }
        }
      } catch (certError) {
        console.error('Certificate generation error:', certError);
        // Don't fail the progress update if certificate generation fails
      }
    }

    console.log('=== TEXT PROGRESS UPDATE COMPLETED ===');
    console.log('Final progress:', {
      overallPercentage: progress.overallProgress.percentage,
      completedContent: progress.overallProgress.completedContent,
      totalContent: progress.overallProgress.totalContent,
      certificateGenerated
    });

    res.json({
      success: true,
      progress: {
        overallProgress: progress.overallProgress,
        contentProgress: progress.contentProgress.find(cp => cp.contentId.toString() === contentId)
      },
      certificateGenerated
    });

  } catch (error) {
    console.error('Text progress update error:', error);
    res.status(500).json({ error: 'Failed to update text progress' });
  }
});

module.exports = router;