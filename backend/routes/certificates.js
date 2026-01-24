const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const User = require('../models/User');
const CourseProgress = require('../models/CourseProgress');
const certificateService = require('../services/certificateService');
const { authenticateToken, requireRole, requireVerifiedPayment } = require('../middleware/auth');

// Get all certificates for a teacher's courses (teacher only) - MOVED UP TO AVOID ROUTE CONFLICT
router.get('/teacher/courses', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.userId || req.user._id;
    
    // Get teacher's courses
    const courses = await Course.find({ teacher: teacherId }).select('_id title');
    const courseIds = courses.map(course => course._id);
    
    // Get certificates for these courses
    const certificates = await Certificate.find({ course: { $in: courseIds } })
      .populate('student', 'firstName lastName email')
      .populate('course', 'title')
      .sort({ completionDate: -1 });
    
    res.json({
      success: true,
      certificates: certificates.map(cert => ({
        id: cert._id,
        certificateId: cert.certificateId,
        certificateUrl: cert.certificateUrl,
        completionDate: cert.completionDate,
        completionPercentage: cert.completionPercentage,
        studentName: cert.studentName,
        courseTitle: cert.courseTitle,
        instructorName: cert.instructorName,
        validUntil: cert.validUntil,
        student: cert.student,
        course: cert.course
      }))
    });
    
  } catch (error) {
    console.error('Get teacher certificates error:', error);
    res.status(500).json({ 
      error: 'Failed to get certificates',
      details: error.message 
    });
  }
});

// Get all automated certificates for teacher's courses
router.get('/teacher/:teacherId', authenticateToken, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Verify the teacher is accessing their own certificates or is admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all courses taught by this teacher
    const courses = await Course.find({ teacher: teacherId }).select('_id title');
    
    // Get all certificates for these courses
    const certificates = await Certificate.find({
      course: { $in: courses.map(c => c._id) }
    })
    .populate('student', 'firstName lastName email')
    .populate('course', 'title')
    .sort({ completionDate: -1 });

    res.json({
      success: true,
      certificates: certificates.map(cert => ({
        _id: cert._id,
        certificateId: cert.certificateId,
        studentName: cert.studentName,
        courseTitle: cert.courseTitle,
        instructorName: cert.instructorName,
        completionDate: cert.completionDate,
        completionPercentage: cert.completionPercentage,
        certificateUrl: cert.certificateUrl,
        validUntil: cert.validUntil,
        student: {
          _id: cert.student._id,
          firstName: cert.student.firstName,
          lastName: cert.student.lastName,
          email: cert.student.email
        },
        course: {
          _id: cert.course._id,
          title: cert.course.title
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching teacher certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

// Serve certificate files
router.get('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../certificates', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Certificate file not found' });
    }
    
    // Set appropriate headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming certificate file:', error);
      res.status(500).json({ error: 'Error serving certificate file' });
    });
  } catch (error) {
    console.error('Error serving certificate file:', error);
    res.status(500).json({ error: 'Error serving certificate file' });
  }
});

// Delete automated certificate
router.delete('/:certificateId', authenticateToken, async (req, res) => {
  try {
    const { certificateId } = req.params;
    const userId = req.user._id;
    
    // Find the certificate
    const certificate = await Certificate.findOne({ certificateId })
      .populate('course', 'teacher');
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Check if user is the teacher of the course or admin
    if (req.user.role !== 'admin' && certificate.course.teacher.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete the PDF file
    const fileName = `certificate_${certificateId}.pdf`;
    const filePath = path.join(__dirname, '../certificates', fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await Certificate.findByIdAndDelete(certificate._id);
    
    res.json({
      success: true,
      message: 'Certificate deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    res.status(500).json({ error: 'Failed to delete certificate' });
  }
});

// Update certificate template/design
router.put('/template/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { templateData } = req.body;
    const userId = req.user.userId || req.user._id;

    // Check if course exists and teacher owns it
    const course = await Course.findOne({ _id: courseId, teacher: userId });
    if (!course) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    // Update course with certificate template data
    course.certificateTemplate = templateData;
    await course.save();

    res.json({
      success: true,
      message: 'Certificate template updated successfully',
      template: course.certificateTemplate
    });
  } catch (error) {
    console.error('Error updating certificate template:', error);
    res.status(500).json({ error: 'Failed to update certificate template' });
  }
});

// Get certificate template for a course
router.get('/template/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId || req.user._id;

    // Check if course exists and teacher owns it
    const course = await Course.findOne({ _id: courseId, teacher: userId });
    if (!course) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    res.json({
      success: true,
      template: course.certificateTemplate || {
        // Default template
        title: 'CERTIFICATE',
        subtitle: 'OF COMPLETION BATCH #2',
        introText: 'THIS IS TO CERTIFY THAT',
        achievementText: 'has completed the course with distinction, exhibiting outstanding mastery of the Navigator strategy and a remarkable commitment to trading excellence.',
        logoText: 'FOREX NAVIGATORS',
        tagline: 'LEARN • GROW • RICH',
        signatureText: 'Adnan Khan',
        backgroundColor: '#A855F7',
        textColor: '#000000',
        accentColor: '#8B5CF6'
      }
    });
  } catch (error) {
    console.error('Error fetching certificate template:', error);
    res.status(500).json({ error: 'Failed to fetch certificate template' });
  }
});

// Generate certificate for course completion
router.post('/generate/:courseId', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId || req.user._id;

    // Check if course exists
    const course = await Course.findById(courseId).populate('teacher', 'firstName lastName');
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if student is enrolled
    const enrollment = course.enrolledStudents.find(
      enrollment => enrollment.student.toString() === userId.toString()
    );
    if (!enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({
      student: userId,
      course: courseId
    });
    if (existingCertificate) {
      return res.json({
      success: true, 
        message: 'Certificate already exists',
        certificate: existingCertificate
      });
    }

    // Get student progress
    const progress = await CourseProgress.findOne({
      student: userId,
      course: courseId
    });
    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    // Check if course is completed (90% or more)
    if (progress.overallProgress.percentage < 90) {
      return res.status(400).json({ 
        error: 'Course not completed',
        message: `You need to complete at least 90% of the course. Current progress: ${progress.overallProgress.percentage}%`
      });
    }

    // Get student details
    const student = await User.findById(userId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Generate certificate
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
    
    res.json({ 
      success: true, 
      message: 'Certificate generated successfully',
      certificate: {
        id: certificate._id,
        certificateId: certificate.certificateId,
        certificateUrl: certificate.certificateUrl,
        completionDate: certificate.completionDate,
        completionPercentage: certificate.completionPercentage,
        studentName: certificate.studentName,
        courseTitle: certificate.courseTitle,
        instructorName: certificate.instructorName,
        validUntil: certificate.validUntil
      }
    });
    
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate certificate',
      details: error.message 
    });
  }
});


// Update certificate (teacher only)
router.put('/:certificateId', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const { certificateId } = req.params;
    const teacherId = req.user.userId || req.user._id;
    const { studentName, courseTitle, instructorName, completionPercentage } = req.body;
    
    // Find certificate and verify teacher owns the course
    const certificate = await Certificate.findById(certificateId)
      .populate('course', 'teacher');
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Check if teacher owns the course
    if (certificate.course.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ error: 'You can only edit certificates for your own courses' });
    }
    
    // Update certificate fields
    if (studentName) certificate.studentName = studentName;
    if (courseTitle) certificate.courseTitle = courseTitle;
    if (instructorName) certificate.instructorName = instructorName;
    if (completionPercentage) certificate.completionPercentage = completionPercentage;
    
    await certificate.save();
    
    res.json({
      success: true,
      message: 'Certificate updated successfully',
      certificate
    });
    
  } catch (error) {
    console.error('Update certificate error:', error);
    res.status(500).json({ 
      error: 'Failed to update certificate',
      details: error.message 
    });
  }
});

// Delete certificate (teacher only)
router.delete('/:certificateId', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const { certificateId } = req.params;
    const teacherId = req.user.userId || req.user._id;
    
    // Find certificate and verify teacher owns the course
    const certificate = await Certificate.findById(certificateId)
      .populate('course', 'teacher');
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Check if teacher owns the course
    if (certificate.course.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ error: 'You can only delete certificates for your own courses' });
    }
    
    // Delete the PDF file
    try {
      const fileName = certificate.certificateUrl.split('/').pop();
      const filePath = path.join(__dirname, '../certificates', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting certificate file:', fileError);
      // Continue with database deletion even if file deletion fails
    }
    
    // Delete from database
    await Certificate.findByIdAndDelete(certificateId);
    
    res.json({
      success: true,
      message: 'Certificate deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete certificate error:', error);
    res.status(500).json({ 
      error: 'Failed to delete certificate',
      details: error.message 
    });
  }
});

// Regenerate certificate (teacher only)
router.post('/regenerate/:certificateId', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const { certificateId } = req.params;
    const teacherId = req.user.userId || req.user._id;
    
    // Find certificate and verify teacher owns the course
    const certificate = await Certificate.findById(certificateId)
      .populate('course', 'teacher')
      .populate('student', 'firstName lastName');
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Check if teacher owns the course
    if (certificate.course.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ error: 'You can only regenerate certificates for your own courses' });
    }
    
    // Delete old PDF file
    try {
      const fileName = certificate.certificateUrl.split('/').pop();
      const filePath = path.join(__dirname, '../certificates', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting old certificate file:', fileError);
    }
    
    // Generate new certificate
    const certificateData = {
      studentName: certificate.studentName,
      courseTitle: certificate.courseTitle,
      instructorName: certificate.instructorName,
      completionDate: certificate.completionDate,
      completionPercentage: certificate.completionPercentage,
      certificateId: certificate.certificateId,
      issuedBy: 'FOREX NAVIGATORS'
    };
    
    const { filePath, fileName, certificateUrl } = await certificateService.generateCertificate(certificateData);
    
    // Update certificate with new file info
    certificate.certificateUrl = certificateUrl;
    await certificate.save();
    
    res.json({
      success: true,
      message: 'Certificate regenerated successfully',
      certificate
    });
    
  } catch (error) {
    console.error('Regenerate certificate error:', error);
    res.status(500).json({ 
      error: 'Failed to regenerate certificate',
      details: error.message 
    });
  }
});

// Get student's certificates
router.get('/my-certificates', authenticateToken, requireVerifiedPayment, requireRole(['student']), async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    const certificates = await Certificate.find({ student: userId })
      .populate('course', 'title description thumbnail')
      .sort({ completionDate: -1 });
    
    res.json({
      success: true,
      certificates: certificates.map(cert => ({
        id: cert._id,
        certificateId: cert.certificateId,
        certificateUrl: cert.certificateUrl,
        completionDate: cert.completionDate,
        completionPercentage: cert.completionPercentage,
        studentName: cert.studentName,
        courseTitle: cert.courseTitle,
        instructorName: cert.instructorName,
        validUntil: cert.validUntil,
        course: cert.course
      }))
    });
    
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ 
      error: 'Failed to get certificates',
      details: error.message 
    });
  }
});

// Verify certificate
router.get('/verify/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId })
      .populate('student', 'firstName lastName email')
      .populate('course', 'title description');

    if (!certificate) {
      return res.status(404).json({ 
        error: 'Certificate not found',
        valid: false 
      });
    }

    // Check if certificate is still valid
    const isValid = new Date() <= certificate.validUntil;
    
    res.json({
      success: true,
      valid: isValid,
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.studentName,
        courseTitle: certificate.courseTitle,
        instructorName: certificate.instructorName,
        completionDate: certificate.completionDate,
        completionPercentage: certificate.completionPercentage,
        validUntil: certificate.validUntil,
        issuedBy: certificate.issuedBy,
        student: certificate.student,
        course: certificate.course
      }
    });
    
  } catch (error) {
    console.error('Certificate verification error:', error);
    res.status(500).json({ 
      error: 'Failed to verify certificate',
      details: error.message 
    });
  }
});

// Download certificate file
router.get('/download/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId });
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const fileName = `certificate_${certificateId}.pdf`;
    const filePath = path.join(__dirname, '../certificates', fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Certificate file not found' });
    }

    res.download(filePath, `${certificate.courseTitle}_Certificate.pdf`);
    
  } catch (error) {
    console.error('Certificate download error:', error);
    res.status(500).json({ 
      error: 'Failed to download certificate',
      details: error.message 
    });
  }
});

module.exports = router;