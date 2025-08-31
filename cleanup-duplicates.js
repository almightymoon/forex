const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function cleanupDuplicates() {
  try {
    console.log('Cleaning up duplicate submissions...\n');

    // Find all assignments
    const assignments = await Assignment.find({});
    console.log(`Found ${assignments.length} assignments`);

    for (const assignment of assignments) {
      if (assignment.submissions && assignment.submissions.length > 0) {
        console.log(`\nProcessing assignment: ${assignment.title}`);
        console.log(`   Original submissions: ${assignment.submissions.length}`);
        
        // Group submissions by student
        const submissionsByStudent = new Map();
        
        assignment.submissions.forEach((submission, index) => {
          const studentId = submission.student.toString();
          
          if (submissionsByStudent.has(studentId)) {
            // Keep the most recent submission
            const existing = submissionsByStudent.get(studentId);
            if (new Date(submission.submittedAt) > new Date(existing.submittedAt)) {
              submissionsByStudent.set(studentId, submission);
            }
          } else {
            submissionsByStudent.set(studentId, submission);
          }
        });
        
        // Replace submissions array with deduplicated submissions
        const uniqueSubmissions = Array.from(submissionsByStudent.values());
        
        if (uniqueSubmissions.length !== assignment.submissions.length) {
          console.log(`   Removing ${assignment.submissions.length - uniqueSubmissions.length} duplicate submissions`);
          assignment.submissions = uniqueSubmissions;
          await assignment.save();
          console.log(`   Final submissions: ${assignment.submissions.length}`);
        } else {
          console.log(`   No duplicates found`);
        }
        
        // Log submission details
        uniqueSubmissions.forEach((sub, index) => {
          console.log(`     Submission ${index + 1}:`);
          console.log(`       Student: ${sub.student}`);
          console.log(`       Status: ${sub.status}`);
          console.log(`       Submitted: ${sub.submittedAt}`);
          console.log(`       Grade: ${sub.grade || 'No grade'}`);
        });
      }
    }

    console.log('\n✅ Duplicate cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
  } finally {
    mongoose.connection.close();
  }
}

cleanupDuplicates();
