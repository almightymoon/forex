const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testAPIResponse() {
  try {
    console.log('Testing API response for assignments...\n');

    // Get the test student
    const testStudent = await User.findOne({ email: 'teststudent@test.com' });
    if (!testStudent) {
      console.log('❌ Test student not found');
      return;
    }

    console.log(`Test student: ${testStudent.firstName} ${testStudent.lastName}`);
    console.log(`Student ID: ${testStudent._id}`);
    console.log(`Enrolled courses: ${testStudent.enrolledCourses.length}`);

    // Simulate what the API should return
    console.log('\n📋 Expected API response structure:');
    console.log('The API should return assignments with this structure:');
    console.log('{');
    console.log('  _id: "assignment_id",');
    console.log('  title: "Test Assignment - Single Submission Only",');
    console.log('  submission: {');
    console.log('    submittedAt: "2025-08-26T11:31:34.000Z",');
    console.log('    textContent: "This is my first and only submission",');
    console.log('    files: [],');
    console.log('    status: "submitted"');
    console.log('  },');
    console.log('  grade: undefined,');
    console.log('  ...other fields');
    console.log('}');

    console.log('\n🎯 To test the frontend:');
    console.log('1. Log in as teststudent@test.com with password: testpassword123');
    console.log('2. Go to student dashboard');
    console.log('3. You should see the test assignment');
    console.log('4. The submit button should be GONE');
    console.log('5. You should see "Already Submitted" instead');
    
    console.log('\n🔍 If you still see the submit button:');
    console.log('- Check browser console for errors');
    console.log('- Verify you are logged in as the test student');
    console.log('- Check if the API is returning sample data instead of real data');
    console.log('- The backend might be falling back to sample data');

  } catch (error) {
    console.error('❌ Error testing API response:', error);
  } finally {
    mongoose.connection.close();
  }
}

testAPIResponse();
