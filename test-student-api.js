const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Assignment = require('./models/Assignment');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testStudentAPI() {
  try {
    console.log('Testing student API endpoint...\n');

    // Get the test student
    const testStudent = await User.findOne({ email: 'teststudent@test.com' });
    if (!testStudent) {
      console.log('❌ Test student not found');
      return;
    }

    console.log(`Test student: ${testStudent.firstName} ${testStudent.lastName}`);
    console.log(`Student ID: ${testStudent._id}`);
    console.log(`Role: ${testStudent.role}`);

    // Check enrolled courses
    console.log('\n📚 Enrolled courses:');
    if (testStudent.enrolledCourses && testStudent.enrolledCourses.length > 0) {
      testStudent.enrolledCourses.forEach((enrollment, index) => {
        console.log(`   Course ${index + 1}: ${enrollment.courseId}`);
      });
    } else {
      console.log('   No enrolled courses');
    }

    // Get the test course
    const testCourse = await Course.findOne({ title: 'Test Course for Assignment' });
    if (testCourse) {
      console.log(`\n✅ Test course found: ${testCourse.title}`);
      console.log(`   Course ID: ${testCourse._id}`);
      console.log(`   Is published: ${testCourse.isPublished}`);
      
      // Check if student is enrolled in this course
      const isEnrolled = testStudent.enrolledCourses.some(
        enrollment => enrollment.courseId.toString() === testCourse._id.toString()
      );
      console.log(`   Student enrolled: ${isEnrolled ? 'Yes' : 'No'}`);
    }

    // Get the test assignment
    const testAssignment = await Assignment.findOne({ title: 'Test Assignment - Single Submission Only' });
    if (testAssignment) {
      console.log(`\n✅ Test assignment found: ${testAssignment.title}`);
      console.log(`   Assignment ID: ${testAssignment._id}`);
      console.log(`   Course: ${testAssignment.course}`);
      console.log(`   Is published: ${testAssignment.isPublished}`);
      console.log(`   Submissions: ${testAssignment.submissions.length}`);
      
      // Check if this student has a submission
      const studentSubmission = testAssignment.submissions.find(
        sub => sub.student.toString() === testStudent._id.toString()
      );
      
      if (studentSubmission) {
        console.log(`   ✅ Student has submission:`);
        console.log(`      Status: ${studentSubmission.status}`);
        console.log(`      Submitted: ${studentSubmission.submittedAt}`);
        console.log(`      Content: ${studentSubmission.textContent ? 'Yes' : 'No'}`);
        console.log(`      Grade: ${studentSubmission.grade || 'No grade'}`);
      } else {
        console.log(`   ❌ Student has no submission`);
      }
    }

    console.log('\n🎯 Expected API response:');
    console.log('When the student calls /api/assignments, they should get:');
    console.log('{');
    console.log('  _id: "assignment_id",');
    console.log('  title: "Test Assignment - Single Submission Only",');
    console.log('  submission: { ... }, // This should exist for the test student');
    console.log('  ...');
    console.log('}');

    console.log('\n🔍 If the API is not working:');
    console.log('1. Check if the student is properly enrolled in the course');
    console.log('2. Check if the assignment is published');
    console.log('3. Check if the backend is finding the student\'s enrolled courses');
    console.log('4. Check if the backend is falling back to sample data');

  } catch (error) {
    console.error('❌ Error testing student API:', error);
  } finally {
    mongoose.connection.close();
  }
}

testStudentAPI();
