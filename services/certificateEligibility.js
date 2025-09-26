const CourseProgress = require('../models/CourseProgress');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const User = require('../models/User');

class CertificateEligibilityService {
  
  /**
   * Check and process certificate eligibility for a student's course progress
   * @param {string} studentId - Student's ID
   * @param {string} courseId - Course ID
   * @returns {Object} - Eligibility status and certificate info
   */
  static async checkAndProcessEligibility(studentId, courseId) {
    try {
      // Get progress record
      const progress = await CourseProgress.findOne({
        student: studentId,
        course: courseId
      }).populate('course', 'title certificate teacher');

      if (!progress) {
        throw new Error('Progress record not found');
      }

      // Check if already issued
      if (progress.certificateEligibility.certificateIssued) {
        return {
          eligible: true,
          alreadyIssued: true,
          certificateId: progress.certificateEligibility.certificateId
        };
      }

      // Check eligibility criteria
      const isEligible = progress.certificateEligibility.isEligible;
      
      if (!isEligible) {
        return {
          eligible: false,
          criteria: progress.certificateEligibility.completionCriteria,
          overallProgress: progress.overallProgress.percentage,
          requirements: {
            minProgress: progress.course.certificate.minProgress,
            currentProgress: progress.overallProgress.percentage
          }
        };
      }

      // Check if certificate is available for this course
      if (!progress.course.certificate.isAvailable) {
        return {
          eligible: false,
          reason: 'Certificate not available for this course'
        };
      }

      // Auto-issue certificate if eligible
      const certificate = await this.autoIssueCertificate(studentId, courseId, progress);
      
      // Update progress record
      progress.certificateEligibility.certificateIssued = true;
      progress.certificateEligibility.certificateId = certificate._id;
      progress.certificateEligibility.certificateIssuedAt = new Date();
      await progress.save();

      return {
        eligible: true,
        certificateIssued: true,
        certificateId: certificate._id,
        certificate: certificate
      };

    } catch (error) {
      console.error('Error checking certificate eligibility:', error);
      throw error;
    }
  }

  /**
   * Automatically issue a certificate for an eligible student
   * @param {string} studentId - Student's ID
   * @param {string} courseId - Course ID
   * @param {Object} progress - Progress record
   * @returns {Object} - Created certificate
   */
  static async autoIssueCertificate(studentId, courseId, progress) {
    try {
      // Get student details
      const student = await User.findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      // Calculate final grade based on completion
      const completionPercentage = progress.overallProgress.percentage;
      const finalGrade = Math.round(completionPercentage);

      // Generate certificate number
      const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Get course teacher info
      const teacher = await User.findById(progress.course.teacher);
      
      // Create certificate metadata
      const metadata = {
        courseTitle: progress.course.title,
        courseDuration: this.calculateCourseDuration(progress.course),
        completionDate: new Date(),
        totalLessons: progress.overallProgress.totalContent,
        completedLessons: progress.overallProgress.completedContent,
        totalAssignments: progress.certificateEligibility.completionCriteria.totalRequiredContent,
        completedAssignments: progress.certificateEligibility.completionCriteria.assignmentsPassed,
        averageScore: finalGrade
      };

      // Create certificate
      const certificate = new Certificate({
        courseId: courseId,
        studentId: studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        grade: finalGrade,
        templateId: null, // Will be set by teacher or default template
        customFields: [
          { name: 'Course', value: progress.course.title },
          { name: 'Completion Date', value: new Date().toLocaleDateString() },
          { name: 'Grade', value: `${finalGrade}%` },
          { name: 'Certificate Number', value: certificateNumber }
        ],
        certificateNumber: certificateNumber,
        instructor: {
          _id: teacher._id,
          firstName: teacher.firstName,
          lastName: teacher.lastName
        },
        status: 'issued',
        metadata: metadata
      });

      await certificate.save();
      
      console.log(`Certificate auto-issued for student ${studentId} in course ${courseId}`);
      return certificate;

    } catch (error) {
      console.error('Error auto-issuing certificate:', error);
      throw error;
    }
  }

  /**
   * Calculate course duration from content
   * @param {Object} course - Course object
   * @returns {string} - Formatted duration
   */
  static calculateCourseDuration(course) {
    if (!course.content) return '0 hours';
    
    const videoContent = course.content.filter(c => c.type === 'video');
    const totalSeconds = videoContent.reduce((total, video) => total + (video.duration || 0), 0);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get certificate eligibility status for multiple courses
   * @param {string} studentId - Student's ID
   * @returns {Array} - Array of eligibility statuses
   */
  static async getEligibilityStatus(studentId) {
    try {
      const progressRecords = await CourseProgress.find({
        student: studentId,
        'certificateEligibility.isEligible': true
      }).populate('course', 'title certificate');

      const eligibilityStatus = progressRecords.map(progress => ({
        courseId: progress.course._id,
        courseTitle: progress.course.title,
        eligible: progress.certificateEligibility.isEligible,
        certificateIssued: progress.certificateEligibility.certificateIssued,
        certificateId: progress.certificateEligibility.certificateId,
        completionCriteria: progress.certificateEligibility.completionCriteria,
        overallProgress: progress.overallProgress.percentage
      }));

      return eligibilityStatus;

    } catch (error) {
      console.error('Error getting eligibility status:', error);
      throw error;
    }
  }

  /**
   * Batch process certificate eligibility for all students
   * This can be run as a scheduled job
   */
  static async batchProcessEligibility() {
    try {
      console.log('Starting batch certificate eligibility processing...');
      
      // Find all progress records that are eligible but not yet issued
      const eligibleProgress = await CourseProgress.find({
        'certificateEligibility.isEligible': true,
        'certificateEligibility.certificateIssued': false
      }).populate('course', 'title certificate teacher');

      let processedCount = 0;
      let issuedCount = 0;

      for (const progress of eligibleProgress) {
        try {
          const result = await this.checkAndProcessEligibility(
            progress.student,
            progress.course._id
          );
          
          processedCount++;
          
          if (result.certificateIssued) {
            issuedCount++;
          }
          
        } catch (error) {
          console.error(`Error processing eligibility for student ${progress.student} in course ${progress.course._id}:`, error);
        }
      }

      console.log(`Batch processing completed: ${processedCount} processed, ${issuedCount} certificates issued`);
      
      return {
        processed: processedCount,
        issued: issuedCount
      };

    } catch (error) {
      console.error('Error in batch processing:', error);
      throw error;
    }
  }

  /**
   * Manually issue certificate for a student (admin/teacher function)
   * @param {string} studentId - Student's ID
   * @param {string} courseId - Course ID
   * @param {string} teacherId - Teacher's ID (for authorization)
   * @returns {Object} - Created certificate
   */
  static async manualIssueCertificate(studentId, courseId, teacherId) {
    try {
      // Verify teacher owns the course
      const course = await Course.findById(courseId);
      if (!course || course.teacher.toString() !== teacherId.toString()) {
        throw new Error('Unauthorized: Teacher does not own this course');
      }

      // Get progress record
      const progress = await CourseProgress.findOne({
        student: studentId,
        course: courseId
      });

      if (!progress) {
        throw new Error('Progress record not found');
      }

      // Issue certificate regardless of eligibility
      const certificate = await this.autoIssueCertificate(studentId, courseId, progress);
      
      // Update progress record
      progress.certificateEligibility.certificateIssued = true;
      progress.certificateEligibility.certificateId = certificate._id;
      progress.certificateEligibility.certificateIssuedAt = new Date();
      await progress.save();

      return certificate;

    } catch (error) {
      console.error('Error manually issuing certificate:', error);
      throw error;
    }
  }
}

module.exports = CertificateEligibilityService;
