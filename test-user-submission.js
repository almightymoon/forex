const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testUserSubmission() {
  try {
    console.log('Testing user submission status...\n');

    // Get the test assignment
    const assignment = await Assignment.findOne({ title: 'Test Assignment - Single Submission Only' });
    if (!assignment) {
      console.log('❌ Test assignment not found');
      return;
    }

    console.log(`Assignment: ${assignment.title}`);
    console.log(`Total submissions: ${assignment.submissions.length}`);

    // Get the test student
    const testStudent = await User.findOne({ email: 'teststudent@test.com' });
    if (!testStudent) {
      console.log('❌ Test student not found');
      return;
    }

    console.log(`\nTest student: ${testStudent.firstName} ${testStudent.lastName} (${testStudent._id})`);

    // Check if this student has submitted
    const studentSubmission = assignment.submissions.find(
      sub => sub.student.toString() === testStudent._id.toString()
    );

    if (studentSubmission) {
      console.log('✅ Student has already submitted this assignment');
      console.log(`   Submission ID: ${studentSubmission._id}`);
      console.log(`   Status: ${studentSubmission.status}`);
      console.log(`   Submitted: ${studentSubmission.submittedAt}`);
      console.log(`   Content: ${studentSubmission.textContent ? 'Yes' : 'No'}`);
      console.log(`   Files: ${studentSubmission.files ? studentSubmission.files.length : 0}`);
      console.log(`   Grade: ${studentSubmission.grade || 'No grade'}`);
      
      // Test submission prevention logic
      console.log('\n🧪 Testing submission prevention...');
      const existingIndex = assignment.submissions.findIndex(
        sub => sub.student.toString() === testStudent._id.toString()
      );
      
      if (existingIndex >= 0) {
        console.log(`✅ Submission prevention would work - existing submission at index ${existingIndex}`);
        console.log('   Student cannot submit again!');
      } else {
        console.log('❌ Submission prevention not working');
      }
    } else {
      console.log('❌ Student has not submitted this assignment yet');
      console.log('   They should be able to submit');
    }

    // Show all submissions for this assignment
    console.log('\n📋 All submissions for this assignment:');
    assignment.submissions.forEach((sub, index) => {
      console.log(`   Submission ${index + 1}:`);
      console.log(`     Student ID: ${sub.student}`);
      console.log(`     Status: ${sub.status}`);
      console.log(`     Submitted: ${sub.submittedAt}`);
      console.log(`     Grade: ${sub.grade || 'No grade'}`);
    });

    console.log('\n🎯 Test completed!');
    
  } catch (error) {
    console.error('❌ Error testing user submission:', error);
  } finally {
    mongoose.connection.close();
  }
}

testUserSubmission();
