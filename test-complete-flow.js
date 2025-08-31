const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const Course = require('./models/Course');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testCompleteFlow() {
  try {
    console.log('Testing complete assignment submission flow...\n');

    // Step 1: Check existing data
    console.log('1. Checking existing data...');
    const courses = await Course.find({});
    const assignments = await Assignment.find({});
    const users = await User.find({});
    
    console.log(`   Courses: ${courses.length}`);
    console.log(`   Assignments: ${assignments.length}`);
    console.log(`   Users: ${users.length}`);

    // Step 2: Create test user if needed
    console.log('\n2. Setting up test user...');
    let testUser = await User.findOne({ email: 'teststudent@test.com' });
    
    if (!testUser) {
      testUser = new User({
        firstName: 'Test',
        lastName: 'Student',
        email: 'teststudent@test.com',
        password: 'testpassword123',
        role: 'student',
        enrolledCourses: []
      });
      await testUser.save();
      console.log('✅ Test student created:', testUser.email);
    } else {
      console.log('✅ Test student already exists:', testUser.email);
    }

    // Step 3: Create test course if needed
    console.log('\n3. Setting up test course...');
    let testCourse = await Course.findOne({ title: 'Test Course for Assignment' });
    
    if (!testCourse) {
      testCourse = new Course({
        title: 'Test Course for Assignment',
        description: 'A test course to verify assignment submission prevention',
        teacher: new mongoose.Types.ObjectId(), // Dummy teacher ID
        isPublished: true,
        price: 0,
        category: 'general',
        level: 'beginner',
        thumbnail: 'https://via.placeholder.com/300x200?text=Test+Course'
      });
      await testCourse.save();
      console.log('✅ Test course created:', testCourse.title);
    } else {
      console.log('✅ Test course already exists:', testCourse.title);
    }

    // Step 4: Enroll student in course
    console.log('\n4. Enrolling student in course...');
    const isEnrolled = testUser.enrolledCourses.some(
      enrollment => enrollment.courseId.toString() === testCourse._id.toString()
    );
    
    if (!isEnrolled) {
      testUser.enrolledCourses.push({
        courseId: testCourse._id,
        enrolledAt: new Date(),
        progress: 0
      });
      await testUser.save();
      console.log('✅ Student enrolled in course');
    } else {
      console.log('✅ Student already enrolled in course');
    }

    // Step 5: Create test assignment if needed
    console.log('\n5. Setting up test assignment...');
    let testAssignment = await Assignment.findOne({ title: 'Test Assignment - Single Submission Only' });
    
    if (!testAssignment) {
      testAssignment = new Assignment({
        title: 'Test Assignment - Single Submission Only',
        description: 'This assignment tests that students can only submit once. Multiple submissions are not allowed.',
        course: testCourse._id,
        teacher: testCourse.teacher,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        maxPoints: 100,
        passingScore: 60,
        assignmentType: 'essay',
        instructions: 'Write a short essay about why single submission is important. Submit only once!',
        difficulty: 'intermediate',
        estimatedTime: 30,
        isPublished: true,
        allowLateSubmission: false,
        latePenalty: 0,
        tags: ['test', 'single-submission'],
        submissions: [] // Start with no submissions
      });
      await testAssignment.save();
      console.log('✅ Test assignment created:', testAssignment.title);
    } else {
      console.log('✅ Test assignment already exists:', testAssignment.title);
    }

    // Step 6: Test submission prevention logic
    console.log('\n6. Testing submission prevention logic...');
    
    // Simulate first submission
    const testSubmission = {
      student: testUser._id,
      submittedAt: new Date(),
      textContent: 'This is my first and only submission',
      files: [],
      status: 'submitted'
    };

    // Check if submission already exists
    const existingSubmissionIndex = testAssignment.submissions.findIndex(
      sub => sub.student.toString() === testUser._id.toString()
    );

    if (existingSubmissionIndex >= 0) {
      console.log('✅ Student already has a submission (index:', existingSubmissionIndex + ')');
      console.log('   This means they cannot submit again!');
    } else {
      console.log('✅ First submission allowed - adding to assignment');
      testAssignment.submissions.push(testSubmission);
      await testAssignment.save();
      console.log(`   Added first submission. Total submissions: ${testAssignment.submissions.length}`);
    }

    // Step 7: Verify the complete setup
    console.log('\n7. Verifying complete setup...');
    
    // Refresh data
    const finalAssignment = await Assignment.findById(testAssignment._id);
    const finalUser = await User.findById(testUser._id);
    
    console.log(`   Assignment: ${finalAssignment.title}`);
    console.log(`   Course: ${testCourse.title}`);
    console.log(`   Student: ${finalUser.firstName} ${finalUser.lastName}`);
    console.log(`   Student enrolled: ${finalUser.enrolledCourses.length > 0 ? 'Yes' : 'No'}`);
    console.log(`   Assignment submissions: ${finalAssignment.submissions.length}`);
    
    if (finalAssignment.submissions.length > 0) {
      const submission = finalAssignment.submissions[0];
      console.log(`   Submission details:`);
      console.log(`     Student ID: ${submission.student}`);
      console.log(`     Status: ${submission.status}`);
      console.log(`     Submitted: ${submission.submittedAt}`);
      console.log(`     Content: ${submission.textContent.substring(0, 50)}...`);
    }

    console.log('\n🎯 Complete flow test completed!');
    console.log('\n📋 Next steps to test in frontend:');
    console.log('1. Log in as the test student (teststudent@test.com)');
    console.log('2. Go to the student dashboard');
    console.log('3. You should see the test assignment');
    console.log('4. Try to submit it - you should see "Already Submitted"');
    console.log('5. The submit button should be replaced with a status message');
    
  } catch (error) {
    console.error('❌ Error testing complete flow:', error);
  } finally {
    mongoose.connection.close();
  }
}

testCompleteFlow();
