const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const Course = require('../models/Course');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Get all certificates for a teacher
router.get('/teacher', authenticateToken, async (req, res) => {
  try {
    const certificates = await Certificate.find({ 
      'instructor._id': req.user._id 
    }).populate('courseId', 'title').sort({ issuedAt: -1 });
    
    res.json({ 
      success: true, 
      certificates: certificates.map(cert => ({
        ...cert.toObject(),
        courseTitle: cert.courseId?.title || 'Unknown Course'
      }))
    });
  } catch (error) {
    console.error('Error fetching teacher certificates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
  }
});

// Get all certificates for a student
router.get('/student', authenticateToken, async (req, res) => {
  try {
    const certificates = await Certificate.find({ 
      studentId: req.user._id 
    }).populate('courseId', 'title').sort({ issuedAt: -1 });
    
    res.json({ 
      success: true, 
      certificates: certificates.map(cert => ({
        ...cert.toObject(),
        courseTitle: cert.courseId?.title || 'Unknown Course'
      }))
    });
  } catch (error) {
    console.error('Error fetching student certificates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
  }
});

// Create a new certificate
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { courseId, studentId, studentName, grade, templateId, customFields } = req.body;
    
    // Verify teacher owns the course
    const course = await Course.findById(courseId);
    if (!course || course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only issue certificates for your own courses' 
      });
    }
    
    // Try to find existing student by name if no studentId provided
    let finalStudentId = studentId;
    if (!finalStudentId && studentName) {
      const existingStudent = await User.findOne({
        firstName: { $regex: new RegExp(studentName.split(' ')[0], 'i') },
        lastName: { $regex: new RegExp(studentName.split(' ').slice(1).join(' '), 'i') },
        role: 'student'
      });
      
      if (existingStudent) {
        finalStudentId = existingStudent._id;
        console.log('Found existing student:', existingStudent.email);
      } else {
        // Generate placeholder ID for new student
        finalStudentId = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        console.log('No existing student found, using placeholder ID');
      }
    }
    
    // Ensure we have a studentId
    if (!finalStudentId) {
      finalStudentId = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      console.log('No studentId provided, using placeholder ID');
    }
    
    // Generate certificate number
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Create certificate
    const certificate = new Certificate({
      courseId,
      studentId: finalStudentId,
      studentName,
      grade,
      templateId,
      customFields,
      certificateNumber,
      instructor: {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      issuedAt: new Date(),
      status: 'issued'
    });
    
    await certificate.save();
    
    res.json({ 
      success: true, 
      certificate: {
        ...certificate.toObject(),
        courseTitle: course.title
      }
    });
  } catch (error) {
    console.error('Error creating certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to create certificate' });
  }
});

// Get certificate templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = await CertificateTemplate.find({ 
      courseId: { $in: await Course.find({ teacher: req.user._id }).distinct('_id') }
    }).populate('courseId', 'title');
    
    res.json({ 
      success: true, 
      templates: templates.map(template => ({
        ...template.toObject(),
        courseTitle: template.courseId?.title || 'Unknown Course'
      }))
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
});

// Create a new certificate template
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    console.log('Creating template with data:', req.body);
    console.log('User ID:', req.user._id);
    
    const { 
      name, 
      courseId, 
      backgroundColor, 
      textColor, 
      borderColor, 
      borderStyle, 
      borderWidth,
      fontFamily,
      fontSize,
      layout,
      customFields 
    } = req.body;
    
    // Verify teacher owns the course
    const course = await Course.findById(courseId);
    if (!course || course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only create templates for your own courses' 
      });
    }
    
    // Create template
    const template = new CertificateTemplate({
      name,
      courseId,
      backgroundColor,
      textColor,
      borderColor,
      borderStyle,
      borderWidth,
      fontFamily,
      fontSize,
      layout,
      customFields,
      createdBy: req.user._id
    });
    
    await template.save();
    
    res.json({ 
      success: true, 
      template: {
        ...template.toObject(),
        courseTitle: course.title
      }
    });
  } catch (error) {
    console.error('Error creating template:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create template',
      error: error.message 
    });
  }
});

// Update a certificate template
router.put('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    // Verify teacher owns the course
    const course = await Course.findById(template.courseId);
    if (!course || course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only edit templates for your own courses' 
      });
    }
    
    // Update template
    Object.assign(template, req.body);
    await template.save();
    
    res.json({ 
      success: true, 
      template: {
        ...template.toObject(),
        courseTitle: course.title
      }
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
});

// Delete a certificate template
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    // Verify teacher owns the course
    const course = await Course.findById(template.courseId);
    if (!course || course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete templates for your own courses' 
      });
    }
    
    await template.deleteOne();
    
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
});

// Download a certificate
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    
    console.log('Certificate download access check:', {
      certificateId: req.params.id,
      studentId: certificate.studentId,
      instructorId: certificate.instructor._id,
      userId: req.user._id,
      studentMatch: certificate.studentId === req.user._id.toString(),
      instructorMatch: certificate.instructor._id.toString() === req.user._id.toString()
    });
    
    // Verify user has access to this certificate
    if (certificate.studentId !== req.user._id.toString() && 
        certificate.instructor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    // Generate PDF using jsPDF with template
    const { jsPDF } = require('jspdf');
    
    // Get template dimensions or use defaults
    const template = await CertificateTemplate.findById(certificate.templateId);
    const width = template?.dimensions?.width || 800;
    const height = template?.dimensions?.height || 600;
    
    // Create PDF with template dimensions
    const doc = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height]
    });
    
    // Add background image if template has one
    if (template?.backgroundImage) {
      try {
        const img = new Image();
        img.src = `public${template.backgroundImage}`;
        doc.addImage(img, 'JPEG', 0, 0, width, height);
      } catch (error) {
        console.log('Could not load background image, using fallback');
      }
    }
    
    // Render template elements
    if (template?.elements && template.elements.length > 0) {
      template.elements.forEach(element => {
        if (element.type === 'text') {
          let textContent = element.text;
          
          // Replace dynamic content
          switch (element.dynamicContent) {
            case 'studentName':
              textContent = certificate.studentName || 'Student Name';
              break;
            case 'courseTitle':
              textContent = certificate.course?.title || 'Course Title';
              break;
            case 'instructorName':
              textContent = `${certificate.instructor?.firstName || ''} ${certificate.instructor?.lastName || ''}`.trim() || 'Instructor Name';
              break;
            case 'completionDate':
              textContent = new Date(certificate.issuedAt).toLocaleDateString();
              break;
            case 'grade':
              textContent = certificate.grade !== undefined ? `${certificate.grade}%` : '';
              break;
            case 'certificateNumber':
              textContent = certificate.certificateNumber;
              break;
          }
          
          if (textContent) {
            doc.setFontSize(element.fontSize || 16);
            doc.setTextColor(element.textColor || '#000000');
            doc.setFont(element.fontFamily || 'Arial');
            
            // Apply font weight
            if (element.fontWeight === 'bold') {
              doc.setFont(element.fontFamily || 'Arial', 'bold');
            } else if (element.fontWeight === 'italic') {
              doc.setFont(element.fontFamily || 'Arial', 'italic');
            }
            
            // Position text based on alignment
            let x = element.x;
            if (element.textAlign === 'center') {
              x = element.x + (element.width / 2);
            } else if (element.textAlign === 'right') {
              x = element.x + element.width;
            }
            
            doc.text(textContent, x, element.y);
          }
        }
      });
    } else {
      // Fallback to basic certificate layout
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text('Certificate of Completion', width/2, 40, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Certificate #: ${certificate.certificateNumber}`, 20, 60);
      
      doc.setFontSize(18);
      doc.text(`This is to certify that`, width/2, 80, { align: 'center' });
      doc.setFontSize(20);
      doc.text(certificate.studentName || 'Student Name', width/2, 100, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text(`has successfully completed the course`, width/2, 120, { align: 'center' });
      doc.setFontSize(18);
      doc.text(certificate.course?.title || 'Course Title', width/2, 140, { align: 'center' });
      
      if (certificate.grade !== undefined) {
        doc.setFontSize(16);
        doc.text(`with a grade of: ${certificate.grade}%`, width/2, 160, { align: 'center' });
      }
      
      doc.setFontSize(14);
      doc.text(`Completed on: ${new Date(certificate.issuedAt).toLocaleDateString()}`, width/2, 180, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Instructor: ${certificate.instructor?.firstName || ''} ${certificate.instructor?.lastName || ''}`.trim() || 'Instructor Name', width/2, 200, { align: 'center' });
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate-${certificate.certificateNumber}.pdf`);
    
    // Send the PDF
    res.send(doc.output('arraybuffer'));
    
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to download certificate' });
  }
});

// View a certificate
router.get('/:id/view', authenticateToken, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    
    console.log('Certificate access check:', {
      certificateId: req.params.id,
      studentId: certificate.studentId,
      instructorId: certificate.instructor._id,
      userId: req.user._id,
      studentMatch: certificate.studentId === req.user._id.toString(),
      instructorMatch: certificate.instructor._id.toString() === req.user._id.toString()
    });
    
    // Verify user has access to this certificate
    if (certificate.studentId !== req.user._id.toString() && 
        certificate.instructor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    // Generate PDF using jsPDF
    const { jsPDF } = require('jspdf');
    const doc = new jsPDF();
    
    // Set certificate styling
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text('Certificate of Completion', 105, 40, { align: 'center' });
    
    // Add certificate number
    doc.setFontSize(12);
    doc.text(`Certificate #: ${certificate.certificateNumber}`, 20, 60);
    
    // Add student name
    doc.setFontSize(18);
    doc.text(`This is to certify that`, 105, 80, { align: 'center' });
    doc.setFontSize(20);
    doc.text(certificate.studentName || 'Student Name', 105, 100, { align: 'center' });
    
    // Add course completion text
    doc.setFontSize(16);
    doc.text(`has successfully completed the course`, 105, 120, { align: 'center' });
    doc.setFontSize(18);
    doc.text(certificate.course?.title || 'Course Title', 105, 140, { align: 'center' });
    
    // Add grade if available
    if (certificate.grade !== undefined) {
      doc.setFontSize(16);
      doc.text(`with a grade of: ${certificate.grade}%`, 105, 160, { align: 'center' });
    }
    
    // Add completion date
    doc.setFontSize(14);
    doc.text(`Completed on: ${new Date(certificate.issuedAt).toLocaleDateString()}`, 105, 180, { align: 'center' });
    
    // Add instructor signature
    doc.setFontSize(12);
    doc.text(`Instructor: ${certificate.instructor?.name || 'Instructor Name'}`, 105, 200, { align: 'center' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=certificate-${certificate.certificateNumber}.pdf`);
    
    // Send the PDF
    res.send(doc.output('arraybuffer'));
    
  } catch (error) {
    console.error('Error viewing certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to view certificate' });
  }
});

// Revoke a certificate
router.put('/:id/revoke', authenticateToken, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    
    // Verify teacher owns the course
    const course = await Course.findById(certificate.courseId);
    if (!course || course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only revoke certificates for your own courses' 
      });
    }
    
    // Update certificate status to revoked
    certificate.status = 'revoked';
    await certificate.save();
    
    res.json({ success: true, message: 'Certificate revoked successfully' });
  } catch (error) {
    console.error('Error revoking certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke certificate' });
  }
});

// Get a specific certificate
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('courseId', 'title')
      .populate('templateId');
    
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    
    // Verify user has access to this certificate
    if (certificate.studentId !== req.user._id.toString() && 
        certificate.instructor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    res.json({ 
      success: true, 
      certificate: {
        ...certificate.toObject(),
        courseTitle: certificate.courseId?.title || 'Unknown Course'
      }
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificate' });
  }
});

module.exports = router;
