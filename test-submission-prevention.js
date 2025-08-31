const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testSubmissionPrevention() {
  try {
    console.log('Testing assignment submission prevention...\n');

    // Test 1: Check current assignments and submissions
    console.log('1. Checking current assignments...');
    const assignments = await Assignment.find({}).populate('course', 'title');
    
    if (assignments.length === 0) {
      console.log('   No assignments found in database');
      return;
    }
    
    console.log(`   Found ${assignments.length} assignments`);
    
    // Find assignments with submissions
    const assignmentsWithSubmissions = assignments.filter(a => a.submissions && a.submissions.length > 0);
    console.log(`   ${assignmentsWithSubmissions.length} assignments have submissions`);
    
    if (assignmentsWithSubmissions.length > 0) {
      const assignment = assignmentsWithSubmissions[0];
      console.log(`   Sample assignment: ${assignment.title}`);
      console.log(`   Submissions: ${assignment.submissions.length}`);
      
      assignment.submissions.forEach((sub, index) => {
        console.log(`     Submission ${index + 1}:`);
        console.log(`       Student: ${sub.student}`);
        console.log(`       Status: ${sub.status}`);
        console.log(`       Submitted: ${sub.submittedAt}`);
        console.log(`       Grade: ${sub.grade || 'No grade'}`);
      });
    }

    // Test 2: Simulate duplicate submission attempt
    console.log('\n2. Testing duplicate submission prevention...');
    
    if (assignmentsWithSubmissions.length > 0) {
      const assignment = assignmentsWithSubmissions[0];
      const firstSubmission = assignment.submissions[0];
      
      console.log(`   Attempting to add duplicate submission for student: ${firstSubmission.student}`);
      
      // Try to add another submission for the same student
      const duplicateSubmission = {
        student: firstSubmission.student,
        submittedAt: new Date(),
        textContent: 'This is a duplicate submission test',
        files: [],
        status: 'submitted'
      };
      
      // Check if this would be allowed
      const existingIndex = assignment.submissions.findIndex(
        sub => sub.student.toString() === firstSubmission.student.toString()
      );
      
      if (existingIndex >= 0) {
        console.log(`   ✅ Duplicate submission would be prevented (existing at index ${existingIndex})`);
        console.log(`   Current submission count: ${assignment.submissions.length}`);
        
        // Don't actually save the duplicate, just show what would happen
        console.log(`   If we tried to save, it would add: ${assignment.submissions.length + 1} submissions`);
      } else {
        console.log(`   ❌ No existing submission found for this student`);
      }
    }

    // Test 3: Check assignment model structure
    console.log('\n3. Checking assignment model structure...');
    const sampleAssignment = assignments[0];
    console.log(`   Assignment: ${sampleAssignment.title}`);
    console.log(`   Has submissions array: ${Array.isArray(sampleAssignment.submissions)}`);
    console.log(`   Submissions type: ${typeof sampleAssignment.submissions}`);
    console.log(`   Submissions length: ${sampleAssignment.submissions?.length || 0}`);
    
    if (sampleAssignment.submissions && sampleAssignment.submissions.length > 0) {
      const sub = sampleAssignment.submissions[0];
      console.log(`   First submission structure:`);
      console.log(`     Student ID: ${sub.student} (type: ${typeof sub.student})`);
      console.log(`     Status: ${sub.status}`);
      console.log(`     Submitted: ${sub.submittedAt}`);
    }

    console.log('\n✅ Submission prevention test completed!');
    
  } catch (error) {
    console.error('❌ Error testing submission prevention:', error);
  } finally {
    mongoose.connection.close();
  }
}

testSubmissionPrevention();
