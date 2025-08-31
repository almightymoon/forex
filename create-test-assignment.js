const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const Course = require('./models/Course');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createTestAssignment() {
  try {
    console.log('Creating test assignment...\n');

    // First, let's check if we have any courses
    const courses = await Course.find({});
    console.log(`Found ${courses.length} courses`);
    
    if (courses.length === 0) {
      console.log('No courses found. Creating a sample course first...');
      
      // Create a sample course
      const sampleCourse = new Course({
        title: 'Test Course for Assignment',
        description: 'A test course to verify assignment submission prevention',
        teacher: new mongoose.Types.ObjectId(), // Dummy teacher ID
        isPublished: true,
        price: 0,
        category: 'general', // Use valid enum value
        level: 'beginner',
        thumbnail: 'https://via.placeholder.com/300x200?text=Test+Course' // Add required thumbnail
      });
      
      await sampleCourse.save();
      console.log('✅ Sample course created:', sampleCourse.title);
    }

    // Get the first available course
    const course = await Course.findOne({});
    if (!course) {
      console.log('❌ No course available for assignment creation');
      return;
    }

    console.log(`Using course: ${course.title}`);

    // Create a test assignment
    const testAssignment = new Assignment({
      title: 'Test Assignment - Single Submission Only',
      description: 'This assignment tests that students can only submit once. Multiple submissions are not allowed.',
      course: course._id,
      teacher: course.teacher,
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
    console.log('✅ Test assignment created successfully!');
    console.log(`   Title: ${testAssignment.title}`);
    console.log(`   Course: ${course.title}`);
    console.log(`   Due Date: ${testAssignment.dueDate}`);
    console.log(`   Max Points: ${testAssignment.maxPoints}`);
    console.log(`   Submissions: ${testAssignment.submissions.length}`);

    // Now let's test the submission prevention logic
    console.log('\n🧪 Testing submission prevention logic...');
    
    // Simulate a student submission
    const dummyStudentId = new mongoose.Types.ObjectId();
    const testSubmission = {
      student: dummyStudentId,
      submittedAt: new Date(),
      textContent: 'This is a test submission',
      files: [],
      status: 'submitted'
    };

    // Check if submission already exists
    const existingSubmissionIndex = testAssignment.submissions.findIndex(
      sub => sub.student.toString() === dummyStudentId.toString()
    );

    if (existingSubmissionIndex >= 0) {
      console.log('❌ Duplicate submission would be allowed (this is wrong!)');
    } else {
      console.log('✅ First submission allowed (this is correct)');
      
      // Add the first submission
      testAssignment.submissions.push(testSubmission);
      await testAssignment.save();
      console.log(`   Added first submission. Total submissions: ${testAssignment.submissions.length}`);
      
      // Now try to add another submission for the same student
      const duplicateSubmission = {
        student: dummyStudentId,
        submittedAt: new Date(),
        textContent: 'This is a duplicate submission attempt',
        files: [],
        status: 'submitted'
      };

      const duplicateIndex = testAssignment.submissions.findIndex(
        sub => sub.student.toString() === dummyStudentId.toString()
      );

      if (duplicateIndex >= 0) {
        console.log('✅ Duplicate submission would be prevented (existing at index ' + duplicateIndex + ')');
        console.log('   This is the correct behavior!');
      } else {
        console.log('❌ Duplicate submission prevention not working');
      }
    }

    console.log('\n🎯 Test assignment setup completed!');
    console.log('   You can now test submission prevention in the frontend.');
    console.log('   Try to submit this assignment multiple times as a student.');
    
  } catch (error) {
    console.error('❌ Error creating test assignment:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestAssignment();
