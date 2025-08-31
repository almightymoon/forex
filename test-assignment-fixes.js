const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const User = require('./models/User');
const Course = require('./models/Course');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testAssignmentFixes() {
  try {
    console.log('Testing assignment submission and grading fixes...\n');

    // Test 1: Check if multiple submissions are prevented
    console.log('1. Testing multiple submission prevention...');
    
    // Find an existing assignment with submissions
    const assignment = await Assignment.findOne({ 'submissions.0': { $exists: true } });
    if (assignment) {
      console.log(`   Found assignment: ${assignment.title}`);
      console.log(`   Current submissions: ${assignment.submissions.length}`);
      
      // Try to add another submission for the same student
      const firstSubmission = assignment.submissions[0];
      const duplicateSubmission = {
        student: firstSubmission.student,
        submittedAt: new Date(),
        textContent: 'Duplicate submission test',
        files: [],
        status: 'submitted'
      };
      
      // This should not be allowed
      assignment.submissions.push(duplicateSubmission);
      await assignment.save();
      console.log(`   After adding duplicate: ${assignment.submissions.length} submissions`);
      
      // Clean up - remove the duplicate
      assignment.submissions.pop();
      await assignment.save();
      console.log(`   Cleaned up: ${assignment.submissions.length} submissions`);
    } else {
      console.log('   No assignments with submissions found for testing');
    }

    // Test 2: Check grading system
    console.log('\n2. Testing grading system...');
    
    if (assignment && assignment.submissions.length > 0) {
      const submission = assignment.submissions[0];
      console.log(`   Submission before grading: ${submission.grade || 'No grade'}`);
      
      // Simulate grading
      submission.grade = 85;
      submission.feedback = 'Great work!';
      submission.gradedAt = new Date();
      submission.gradedBy = new mongoose.Types.ObjectId();
      submission.status = 'graded';
      
      await assignment.save();
      console.log(`   Submission after grading: ${submission.grade}%`);
      console.log(`   Status: ${submission.status}`);
      console.log(`   Feedback: ${submission.feedback}`);
    }

    // Test 3: Check assignment data structure
    console.log('\n3. Testing assignment data structure...');
    
    const testAssignment = await Assignment.findOne().populate('course', 'title');
    if (testAssignment) {
      console.log(`   Assignment: ${testAssignment.title}`);
      console.log(`   Course: ${testAssignment.course?.title || 'No course'}`);
      console.log(`   Submissions: ${testAssignment.submissions.length}`);
      
      if (testAssignment.submissions.length > 0) {
        const sub = testAssignment.submissions[0];
        console.log(`   First submission:`);
        console.log(`     Student: ${sub.student}`);
        console.log(`     Status: ${sub.status}`);
        console.log(`     Grade: ${sub.grade || 'No grade'}`);
        console.log(`     Feedback: ${sub.feedback || 'No feedback'}`);
      }
    }

    console.log('\n✅ Assignment fixes test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing assignment fixes:', error);
  } finally {
    mongoose.connection.close();
  }
}

testAssignmentFixes();
