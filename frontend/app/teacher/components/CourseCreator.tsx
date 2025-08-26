import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useToast } from '../../../components/Toast';
import { 
  Plus, 
  Save, 
  Eye, 
  Trash2, 
  Upload, 
  FileText, 
  Video, 
  Image, 
  Link, 
  CheckSquare,
  Settings,
  X,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
  GripVertical
} from 'lucide-react';

interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'matching' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  points: number;
  required: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level?: string;
  price?: number;
  currency?: string;
  enrolledStudents: number;
  totalLessons: number;
  completedLessons: number;
  rating: number;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  thumbnail?: string;
  requirements?: string[];
  learningOutcomes?: string[];
  content?: any[];
  quizzes?: any[];
  assignments?: any[];
  instructor?: string;
}

interface ContentBlock {
  id: string;
  type: 'text' | 'video' | 'image' | 'file';
  title: string;
  content: string;
  order: number;
  metadata?: any;
  textContent?: string;
  videoUrl?: string;
  description?: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  courseId: string;
  instructor: string;
  dueDate: string;
  maxPoints: number;
  passingScore: number;
  assignmentType: 'essay' | 'quiz' | 'project' | 'presentation' | 'analysis' | 'other';
  instructions?: string;
  attachments?: Array<{
    title: string;
    description: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  rubric?: Array<{
    criterion: string;
    description: string;
    maxPoints: number;
    weight: number;
  }>;
  isPublished: boolean;
  allowLateSubmission: boolean;
  latePenalty: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime?: number;
  isGroupAssignment: boolean;
  maxGroupSize?: number;
  tags?: string[];
}

interface CourseCreatorProps {
  onSave: (courseData: any) => void;
  onCancel: () => void;
  initialData?: any;
  editingCourse?: Course | null;
}

// Client-side only component to prevent hydration issues
const CourseCreatorClient = ({ onSave, onCancel, initialData, editingCourse }: CourseCreatorProps) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('basic');
  const [courseData, setCourseData] = useState({
    title: editingCourse?.title || initialData?.title || '',
    description: editingCourse?.description || initialData?.description || '',
    category: editingCourse?.category || initialData?.category || 'forex',
    level: editingCourse?.level || initialData?.level || 'beginner',
    price: editingCourse?.price || initialData?.price || 0,
    currency: editingCourse?.currency || initialData?.currency || 'USD',
    thumbnail: editingCourse?.thumbnail || initialData?.thumbnail || '',
    requirements: editingCourse?.requirements || initialData?.requirements || [],
    learningOutcomes: editingCourse?.learningOutcomes || initialData?.learningOutcomes || [],
    content: editingCourse?.content || initialData?.content || [],
    quizzes: editingCourse?.quizzes || initialData?.quizzes || [],
    settings: {
      allowPreview: true,
      requireEnrollment: true,
      certificateOnCompletion: false,
      maxAttempts: 3,
      passingScore: 70
    }
  });

  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(editingCourse?.content || initialData?.content || []);
  const [quizzes, setQuizzes] = useState<Question[]>(editingCourse?.quizzes || initialData?.quizzes || []);
  const [assignments, setAssignments] = useState<Assignment[]>(editingCourse?.assignments || initialData?.assignments || []);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [showAssignmentBuilder, setShowAssignmentBuilder] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>(['forex', 'crypto', 'stocks', 'commodities', 'options', 'futures', 'general']);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Update state when editingCourse changes
  useEffect(() => {
    if (editingCourse) {
      setCourseData({
        title: editingCourse.title || '',
        description: editingCourse.description || '',
        category: editingCourse.category || 'forex',
        level: editingCourse.level || 'beginner',
        price: editingCourse.price || 0,
        currency: editingCourse.currency || 'USD',
        thumbnail: editingCourse.thumbnail || '',
        requirements: editingCourse.requirements || [],
        learningOutcomes: editingCourse.learningOutcomes || [],
        content: editingCourse.content || [],
        quizzes: editingCourse.quizzes || [],
        settings: {
          allowPreview: true,
          requireEnrollment: true,
          certificateOnCompletion: false,
          maxAttempts: 3,
          passingScore: 70
        }
      });
      setContentBlocks(editingCourse.content || []);
      setQuizzes(editingCourse.quizzes || []);
      setAssignments(editingCourse.assignments || []);
    }
  }, [editingCourse]);

  const addContentBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: '',
      order: contentBlocks.length + 1, // Start from 1, not 0
      metadata: {},
      // Add required fields based on type
      textContent: type === 'text' ? 'Enter your text content here...' : '',
      videoUrl: type === 'video' ? '' : '',
      description: `Description for ${type} content`
    };
    setContentBlocks([...contentBlocks, newBlock]);
    setEditingBlock(newBlock);
  };

  const addQuiz = () => {
    const newQuiz: Question = {
      id: Date.now().toString(),
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      points: 1,
      required: true
    };
    setQuizzes([...quizzes, newQuiz]);
    setEditingQuestion(newQuiz);
    setShowQuizBuilder(true);
  };

  const addAssignment = () => {
    const newAssignment: Assignment = {
      id: Date.now().toString(),
      title: 'New Assignment',
      description: 'Assignment description',
      courseId: editingCourse?.id || '',
      instructor: editingCourse?.instructor || '',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      maxPoints: 100,
      passingScore: 70,
      assignmentType: 'essay',
      instructions: 'Complete this assignment according to the instructions.',
      isPublished: false,
      allowLateSubmission: false,
      latePenalty: 0,
      difficulty: 'intermediate',
      isGroupAssignment: false,
      maxGroupSize: 1,
      tags: []
    };
    setAssignments([...assignments, newAssignment]);
    setEditingAssignment(newAssignment);
    setShowAssignmentBuilder(true);
  };

  const updateContentBlock = (id: string, updates: Partial<ContentBlock>) => {
    setContentBlocks(blocks => 
      blocks.map(block => 
        block.id === id ? { ...block, ...updates } : block
      )
    );
  };

  const updateQuiz = (id: string, updates: Partial<Question>) => {
    setQuizzes(quiz => 
      quiz.map(q => 
        q.id === id ? { ...q, ...updates } : q
      )
    );
  };

  const updateAssignment = (id: string, updates: Partial<Assignment>) => {
    setAssignments(assignments => 
      assignments.map(a => 
        a.id === id ? { ...a, ...updates } : a
      )
    );
  };

  const deleteContentBlock = (id: string) => {
    setContentBlocks(blocks => blocks.filter(block => block.id !== id));
  };

  const deleteQuiz = (id: string) => {
    setQuizzes(quiz => quiz.filter(q => q.id !== id));
  };

  const deleteAssignment = (id: string) => {
    setAssignments(assignments => assignments.filter(a => a.id !== id));
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          setCourseData({ ...courseData, thumbnail: result.url });
        }
      } catch (error) {
        console.error('Error uploading thumbnail:', error);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, setEditingData?: (data: any) => void) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', files[0]);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Upload successful:', result);
          // Update the content block with the uploaded file URL
          if (editingBlock) {
            updateContentBlock(editingBlock.id, { content: result.url });
            // Also update the local editing data for immediate UI update if setEditingData is provided
            if (setEditingData) {
              setEditingData(prev => ({ ...prev, content: result.url }));
            }
          }
        } else {
          let errorMessage = 'Upload failed';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || response.statusText;
            console.error('Upload failed:', response.status, errorData);
          } catch (e) {
            errorMessage = response.statusText;
            console.error('Upload failed:', response.status, response.statusText);
          }
          showToast(`File upload failed: ${errorMessage}. Please try again.`, 'error');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        showToast('Error uploading file. Please try again.', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const addCategory = () => {
    if (newCategory.trim() && !customCategories.includes(newCategory.trim())) {
      setCustomCategories([...customCategories, newCategory.trim()]);
      setNewCategory('');
      setShowCategoryModal(false);
    }
  };

  const removeCategory = (category: string) => {
    if (customCategories.length > 1) {
      setCustomCategories(customCategories.filter(c => c !== category));
      if (courseData.category === category) {
        setCourseData({ ...courseData, category: customCategories[0] });
      }
    }
  };

  const handleSaveDraft = async () => {
    // Validate required fields
    if (!courseData.title.trim()) {
      showToast('Please enter a course title', 'warning');
      return;
    }
    if (!courseData.description.trim()) {
      showToast('Please enter a course description', 'warning');
      return;
    }
    if (!courseData.category) {
      showToast('Please select a course category', 'warning');
      return;
    }
    if (!courseData.thumbnail) {
      showToast('Please upload a course thumbnail', 'warning');
      return;
    }

          // Transform content blocks to match backend schema
      const transformedContent = contentBlocks.map(block => {
        const baseBlock = {
          title: block.title,
          description: block.description || '',
          type: block.type === 'text' ? 'text' : 
                block.type === 'video' ? 'video' : 
                block.type === 'image' ? 'text' : 'text', // Map image to text for now
          order: block.order,
          isPreview: false,
          duration: 0,
          views: 0
        };

        // Add type-specific required fields
        if (block.type === 'text' || block.type === 'image') {
          return {
            ...baseBlock,
            textContent: block.textContent || block.content || 'Default text content',
            type: 'text'
          };
        } else if (block.type === 'video') {
          return {
            ...baseBlock,
            videoUrl: block.videoUrl || block.content || 'https://example.com/video',
            type: 'video'
          };
        } else if (block.type === 'file') {
          return {
            ...baseBlock,
            textContent: `File: ${block.content || 'default-file.pdf'}`,
            type: 'text'
          };
        } else {
          // Default to text for unknown types
          return {
            ...baseBlock,
            textContent: block.textContent || block.content || 'Default content',
            type: 'text'
          };
        }
      });

            const finalCourseData: any = {
        ...courseData,
        content: transformedContent,
        quizzes,
        updatedAt: new Date().toISOString(),
        status: 'draft',
        isPublished: false
      };

      // Save assignments separately to the database
      if (assignments.length > 0) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            for (const assignment of assignments) {
              const assignmentData = {
                ...assignment,
                course: editingCourse?.id || 'temp-course-id',
                instructor: editingCourse?.instructor || 'temp-instructor-id'
              };
              
              // Save assignment to database
              const response = await fetch('/api/assignments', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(assignmentData)
              });
              
              if (!response.ok) {
                console.error('Failed to save assignment:', assignment.title);
              }
            }
          }
        } catch (error) {
          console.error('Error saving assignments:', error);
        }
      }

      // If editing, preserve existing fields, if creating, add new fields
      if (editingCourse) {
        finalCourseData.id = editingCourse.id;
        finalCourseData.createdAt = editingCourse.createdAt;
        finalCourseData.enrollmentCount = editingCourse.enrolledStudents || 0;
        finalCourseData.rating = editingCourse.rating || 0;
        finalCourseData.totalRatings = 0; // Default value
      } else {
        finalCourseData.createdAt = new Date().toISOString();
        finalCourseData.enrollmentCount = 0;
        finalCourseData.rating = 0;
        finalCourseData.totalRatings = 0;
      }
      
      console.log('Saving course draft:', finalCourseData);
      onSave(finalCourseData);
  };

  const handlePublish = async () => {
    // Validate required fields
    if (!courseData.title.trim()) {
      showToast('Please enter a course title', 'warning');
      return;
    }
    if (!courseData.description.trim()) {
      showToast('Please enter a course description', 'warning');
      return;
    }
    if (!courseData.category) {
      showToast('Please select a course category', 'warning');
      return;
    }
    if (!courseData.thumbnail) {
      showToast('Please upload a course thumbnail', 'warning');
      return;
    }

          // Transform content blocks to match backend schema
      const transformedContent = contentBlocks.map(block => {
        const baseBlock = {
          title: block.title,
          description: block.description || '',
          type: block.type === 'text' ? 'text' : 
                block.type === 'video' ? 'video' : 
                block.type === 'image' ? 'text' : 'text', // Map image to text for now
          order: block.order,
          isPreview: false,
          duration: 0,
          views: 0
        };

        // Add type-specific required fields
        if (block.type === 'text' || block.type === 'image') {
          return {
            ...baseBlock,
            textContent: block.textContent || block.content || 'Default text content',
            type: 'text'
          };
        } else if (block.type === 'video') {
          return {
            ...baseBlock,
            videoUrl: block.videoUrl || block.content || 'https://example.com/video',
            type: 'video'
          };
        } else if (block.type === 'file') {
          return {
            ...baseBlock,
            textContent: `File: ${block.content || 'default-file.pdf'}`,
            type: 'text'
          };
        } else {
          // Default to text for unknown types
          return {
            ...baseBlock,
            textContent: block.textContent || block.content || 'Default content',
            type: 'text'
          };
        }
      });

            const finalCourseData: any = {
        ...courseData,
        content: transformedContent,
        quizzes,
        updatedAt: new Date().toISOString(),
        status: 'published',
        isPublished: true
      };

      // Save assignments separately to the database
      if (assignments.length > 0) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            for (const assignment of assignments) {
              const assignmentData = {
                ...assignment,
                course: editingCourse?.id || 'temp-course-id',
                instructor: editingCourse?.instructor || 'temp-instructor-id'
              };
              
              // Save assignment to database
              const response = await fetch('/api/assignments', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(assignmentData)
              });
              
              if (!response.ok) {
                console.error('Failed to save assignment:', assignment.title);
              }
            }
          }
        } catch (error) {
          console.error('Error saving assignments:', error);
        }
      }

      // If editing, preserve existing fields, if creating, add new fields
      if (editingCourse) {
        finalCourseData.id = editingCourse.id;
        finalCourseData.createdAt = editingCourse.createdAt;
        finalCourseData.enrollmentCount = editingCourse.enrolledStudents || 0;
        finalCourseData.rating = editingCourse.rating || 0;
        finalCourseData.totalRatings = 0; // Default value
      } else {
        finalCourseData.createdAt = new Date().toISOString();
        finalCourseData.enrollmentCount = 0;
        finalCourseData.rating = 0;
        finalCourseData.totalRatings = 0;
      }
      
      console.log('Publishing course:', finalCourseData);
      onSave(finalCourseData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {editingCourse ? 'Edit Course' : 'Create New Course'}
              </h1>
              <p className="text-gray-600">
                {editingCourse ? 'Update your course content and settings' : 'Build your course with essential tools'}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </button>
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Publish Course</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'basic', name: 'Basic Info', icon: Settings },
              { id: 'content', name: 'Content Builder', icon: FileText },
              { id: 'quizzes', name: 'Assessments', icon: CheckSquare },
              { id: 'assignments', name: 'Assignments', icon: FileText },
              { id: 'preview', name: 'Preview', icon: Eye }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'basic' && (
          <div suppressHydrationWarning>
            <BasicInfoTab 
              courseData={courseData} 
              setCourseData={setCourseData}
              customCategories={customCategories}
              setCustomCategories={setCustomCategories}
              showCategoryModal={showCategoryModal}
              setShowCategoryModal={setShowCategoryModal}
              newCategory={newCategory}
              setNewCategory={setNewCategory}
              addCategory={addCategory}
              removeCategory={removeCategory}
              thumbnailInputRef={thumbnailInputRef}
              handleThumbnailUpload={handleThumbnailUpload}
            />
          </div>
        )}

        {activeTab === 'content' && (
          <ContentBuilderTab
            contentBlocks={contentBlocks}
            setContentBlocks={setContentBlocks}
            addContentBlock={addContentBlock}
            updateContentBlock={updateContentBlock}
            deleteContentBlock={deleteContentBlock}
            editingBlock={editingBlock}
            setEditingBlock={setEditingBlock}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
            isUploading={isUploading}
          />
        )}

        {activeTab === 'quizzes' && (
          <QuizzesTab
            quizzes={quizzes}
            setQuizzes={setQuizzes}
            addQuiz={addQuiz}
            updateQuiz={updateQuiz}
            deleteQuiz={deleteQuiz}
            editingQuestion={editingQuestion}
            setEditingQuestion={setEditingQuestion}
            showQuizBuilder={showQuizBuilder}
            setShowQuizBuilder={setShowQuizBuilder}
          />
        )}

        {activeTab === 'assignments' && (
          <AssignmentsTab
            assignments={assignments}
            setAssignments={setAssignments}
            addAssignment={addAssignment}
            updateAssignment={updateAssignment}
            deleteAssignment={deleteAssignment}
            editingAssignment={editingAssignment}
            setEditingAssignment={setEditingAssignment}
            showAssignmentBuilder={showAssignmentBuilder}
            setShowAssignmentBuilder={setShowAssignmentBuilder}
          />
        )}

        {activeTab === 'preview' && (
          <PreviewTab 
            courseData={courseData}
            contentBlocks={contentBlocks}
            quizzes={quizzes}
          />
        )}
      </div>
    </div>
  );
}

// Basic Info Tab Component
function BasicInfoTab({ 
  courseData, 
  setCourseData, 
  customCategories, 
  setCustomCategories,
  showCategoryModal,
  setShowCategoryModal,
  newCategory,
  setNewCategory,
  addCategory,
  removeCategory,
  thumbnailInputRef,
  handleThumbnailUpload
}: any) {
  const [requirements, setRequirements] = useState('');
  const [outcomes, setOutcomes] = useState('');

  // Use useEffect to set initial values after component mounts to avoid hydration mismatch
  useEffect(() => {
    setRequirements(courseData.requirements.join('\n'));
    setOutcomes(courseData.learningOutcomes.join('\n'));
  }, [courseData.requirements, courseData.learningOutcomes]);

    const updateRequirements = (value: string) => {
    const lines = value.split('\n');
    setRequirements(value);
    setCourseData({
      ...courseData,
      requirements: lines.filter(r => r.trim())
    });
  };

    const updateOutcomes = (value: string) => {
    const lines = value.split('\n');
    setOutcomes(value);
    setCourseData({
      ...courseData,
      learningOutcomes: lines.filter(o => o.trim())
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Title *
            </label>
            <input
              type="text"
              value={courseData.title}
              onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter course title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <div className="flex space-x-2">
              <select
                value={courseData.category}
                onChange={(e) => setCourseData({ ...courseData, category: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {customCategories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'forex' ? 'Forex Trading' :
                     category === 'crypto' ? 'Cryptocurrency' :
                     category === 'stocks' ? 'Stock Trading' :
                     category === 'commodities' ? 'Commodities' :
                     category === 'options' ? 'Options Trading' :
                     category === 'futures' ? 'Futures Trading' :
                     category === 'general' ? 'General Finance' : category}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level *
            </label>
            <select
              value={courseData.level}
              onChange={(e) => setCourseData({ ...courseData, level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (USD)
            </label>
            <input
              type="number"
              value={courseData.price}
              onChange={(e) => setCourseData({ ...courseData, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={courseData.description}
            onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe your course..."
          />
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Course Thumbnail
          </label>
          <div className="flex items-center space-x-4">
            {courseData.thumbnail && (
              <img 
                src={courseData.thumbnail} 
                alt="Course thumbnail" 
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            <input
              ref={thumbnailInputRef}
              type="file"
              onChange={handleThumbnailUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => thumbnailInputRef.current?.click()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Upload Thumbnail
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Requirements & Outcomes</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prerequisites (use bullet points with • or -)
            </label>
            <textarea
              value={requirements}
              onChange={(e) => updateRequirements(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="• Basic understanding of finance\n• Familiarity with trading concepts\n• No prior experience required"
            />

          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Learning Outcomes (use bullet points with • or -)
            </label>
            <textarea
              value={outcomes}
              onChange={(e) => updateOutcomes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="• Understand forex trading fundamentals\n• Learn risk management strategies\n• Master technical analysis techniques"
            />

          </div>
        </div>
      </div>

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Categories</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add New Category
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter category name"
                    />
                    <button
                      onClick={addCategory}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Existing Categories
                  </label>
                  <div className="space-y-2">
                    {customCategories.map((category) => (
                      <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span>{category}</span>
                        {customCategories.length > 1 && (
                          <button
                            onClick={() => removeCategory(category)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Content Builder Tab Component
function ContentBuilderTab({
  contentBlocks,
  setContentBlocks,
  addContentBlock,
  updateContentBlock,
  deleteContentBlock,
  editingBlock,
  setEditingBlock,
  fileInputRef,
  handleFileUpload,
  isUploading
}: any) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newBlocks = [...contentBlocks];
      const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
      newBlocks.splice(dropIndex, 0, draggedBlock);
      
      // Update order numbers
      newBlocks.forEach((block, index) => {
        block.order = index + 1;
      });
      
      setContentBlocks(newBlocks);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* Content Block Types */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Content</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: 'text', icon: FileText, label: 'Text' },
            { type: 'video', icon: Video, label: 'Video' },
            { type: 'image', icon: Image, label: 'Image' },
            { type: 'file', icon: Upload, label: 'File' }
          ].map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => addContentBlock(type)}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
            >
              <Icon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Blocks */}
      <div className="space-y-4">
        {contentBlocks.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700 flex items-center space-x-2">
              <GripVertical className="w-4 h-4" />
              <span>💡 <strong>Drag and drop</strong> content blocks to reorder them. The sequence will be saved automatically.</span>
            </p>
          </div>
        )}
        
        {contentBlocks.map((block, index) => (
          <ContentBlock
            key={block.id}
            block={block}
            index={index}
            onUpdate={updateContentBlock}
            onDelete={deleteContentBlock}
            onEdit={() => setEditingBlock(block)}
            isEditing={editingBlock?.id === block.id}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            isDragging={draggedIndex === index}
            isDragOver={dragOverIndex === index}
          />
        ))}
      </div>

      {/* Content Editor Modal */}
      {editingBlock && (
        <ContentEditor
          block={editingBlock}
          onSave={(updates) => {
            updateContentBlock(editingBlock.id, updates);
            setEditingBlock(null);
          }}
          onCancel={() => setEditingBlock(null)}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          isUploading={isUploading}
        />
      )}
    </div>
  );
}

// Content Block Component
function ContentBlock({ 
  block, 
  index, 
  onUpdate, 
  onDelete, 
  onEdit, 
  isEditing,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver
}: any) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'text': return FileText;
      case 'video': return Video;
      case 'image': return Image;
      case 'file': return Upload;
      default: return FileText;
    }
  };

  const Icon = getIcon(block.type);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-xl shadow-sm border-2 p-4 transition-all duration-200 cursor-move ${
        isDragging 
          ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
          : isDragOver 
            ? 'border-green-400 bg-green-50' 
            : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{block.title}</h4>
            <p className="text-sm text-gray-500">Order: {index + 1}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(block.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Drag indicator */}
      {isDragOver && (
        <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-sm text-green-700 text-center">
          Drop here to reorder
        </div>
      )}
    </div>
  );
}

// Rich Text Editor Component
function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertText = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('insertText', false, text);
    document.body.removeChild(textarea);
    editorRef.current?.focus();
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      const width = prompt('Enter image width (optional, e.g., 300px):') || '';
      const height = prompt('Enter image height (optional, e.g., 200px):') || '';
      
      let imgTag = `<img src="${url}" alt="Image"`;
      if (width) imgTag += ` width="${width}"`;
      if (height) imgTag += ` height="${height}"`;
      imgTag += ' style="max-width: 100%; height: auto;" />';
      
      insertText(imgTag);
    }
  };

  const insertVideo = () => {
    const url = prompt('Enter video URL:');
    if (url) {
      const videoHtml = `<video controls width="100%"><source src="${url}" type="video/mp4">Your browser does not support the video tag.</video>`;
      insertText(videoHtml);
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    const text = prompt('Enter link text:');
    if (url && text) {
      execCommand('createLink', url);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg">
      {/* Toolbar */}
      <div className="border-b border-gray-300 p-2 bg-gray-50 flex flex-wrap gap-1">
        <button
          onClick={() => execCommand('bold')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('italic')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('underline')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          onClick={() => execCommand('justifyLeft')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('justifyCenter')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('justifyRight')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          onClick={() => execCommand('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('insertOrderedList')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          onClick={insertImage}
          className="p-2 hover:bg-gray-200 rounded"
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          onClick={insertVideo}
          className="p-2 hover:bg-gray-200 rounded"
          title="Insert Video"
        >
          <VideoIcon className="w-4 h-4" />
        </button>
        <button
          onClick={insertLink}
          className="p-2 hover:bg-gray-200 rounded"
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="p-4 min-h-[200px] focus:outline-none"
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={handleInput}
        onBlur={handleInput}
      />
    </div>
  );
}

// Content Editor Component
function ContentEditor({ block, onSave, onCancel, fileInputRef, handleFileUpload, isUploading }: any) {
  const [editingData, setEditingData] = useState(block);

  const handleSave = () => {
    onSave(editingData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Edit {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Content
            </h3>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={editingData.title}
                onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {block.type === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <RichTextEditor
                  value={editingData.content}
                  onChange={(value) => setEditingData({ ...editingData, content: value })}
                />
              </div>
            )}

            {block.type === 'video' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL
                </label>
                <input
                  type="url"
                  value={editingData.content}
                  onChange={(e) => setEditingData({ ...editingData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            )}

            {block.type === 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => handleFileUpload(e, setEditingData)}
                    accept="image/*"
                    className="hidden"
                  />
                  {editingData.content ? (
                    <div className="mb-4">
                      <div className="relative inline-block group">
                        <img 
                          src={editingData.content} 
                          alt="Uploaded image" 
                          className="max-w-full h-auto rounded-lg mx-auto max-h-48 cursor-pointer hover:opacity-90 transition-opacity"
                          style={{
                            width: editingData.metadata?.imageWidth || 'auto',
                            height: editingData.metadata?.imageHeight || 'auto'
                          }}
                        />
                        
                        {/* Resize Handle */}
                        <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                             onClick={() => {
                               const width = prompt('Enter new width (e.g., 400px):', editingData.metadata?.imageWidth || '');
                               const height = prompt('Enter new height (e.g., 300px):', editingData.metadata?.imageHeight || '');
                               
                               if (width || height) {
                                 setEditingData({
                                   ...editingData,
                                   metadata: {
                                     ...editingData.metadata,
                                     imageWidth: width || editingData.metadata?.imageWidth,
                                     imageHeight: height || editingData.metadata?.imageHeight
                                   }
                                 });
                               }
                             }}>
                          Resize
                        </div>
                      </div>
                      
                      {/* Image Size Controls */}
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center space-x-4">
                          <label className="text-sm font-medium text-gray-700">Width:</label>
                          <input
                            type="number"
                            value={editingData.metadata?.imageWidth || ''}
                            onChange={(e) => setEditingData({
                              ...editingData,
                              metadata: {
                                ...editingData.metadata,
                                imageWidth: e.target.value + 'px'
                              }
                            })}
                            placeholder="Auto"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-xs text-gray-500">px</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <label className="text-sm font-medium text-gray-700">Height:</label>
                          <input
                            type="number"
                            value={editingData.metadata?.imageHeight || ''}
                            onChange={(e) => setEditingData({
                              ...editingData,
                              metadata: {
                                ...editingData.metadata,
                                imageHeight: e.target.value + 'px'
                              }
                            })}
                            placeholder="Auto"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-xs text-gray-500">px</span>
                        </div>
                        <button
                          onClick={() => setEditingData({
                            ...editingData,
                            metadata: {
                              ...editingData.metadata,
                              imageWidth: undefined,
                              imageHeight: undefined
                            }
                          })}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Reset to auto size
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">Drop image here or click to upload</p>
                      <p className="text-sm text-gray-500 mb-4">Supports JPG, PNG, GIF</p>
                    </>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      editingData.content ? 'Change Image' : 'Choose Image'
                    )}
                  </button>
                </div>
              </div>
            )}

            {block.type === 'file' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => handleFileUpload(e, setEditingData)}
                    className="hidden"
                  />
                  {editingData.content ? (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                        <Upload className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-700">File uploaded successfully</span>
                        <a 
                          href={editingData.content} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View File
                        </a>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">Drop file here or click to upload</p>
                      <p className="text-sm text-gray-500 mb-4">Supports PDF, DOC, PPT, and more</p>
                    </>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      editingData.content ? 'Change File' : 'Choose File'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quizzes Tab Component
function QuizzesTab({
  quizzes,
  setQuizzes,
  addQuiz,
  updateQuiz,
  deleteQuiz,
  editingQuestion,
  setEditingQuestion,
  showQuizBuilder,
  setShowQuizBuilder
}: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Assessments</h3>
          <button
            onClick={addQuiz}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>

        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
            <p className="text-gray-500 mb-4">Start building your assessment by adding questions</p>
            <button
              onClick={addQuiz}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Your First Question
            </button>
          </div>
        ) : (
          <div className="space-y-4">
                    {quizzes.map((quiz, index) => (
          <QuizQuestion
            key={quiz.id}
            question={quiz}
            index={index}
            onEdit={() => {
              setEditingQuestion(quiz);
              setShowQuizBuilder(true);
            }}
            onDelete={() => deleteQuiz(quiz.id)}
          />
        ))}
          </div>
        )}
      </div>

      {/* Quiz Builder Modal */}
      {showQuizBuilder && editingQuestion && (
        <QuizBuilder
          question={editingQuestion}
          onSave={(updates) => {
            updateQuiz(editingQuestion.id, updates);
            setEditingQuestion(null);
            setShowQuizBuilder(false);
          }}
          onCancel={() => {
            setEditingQuestion(null);
            setShowQuizBuilder(false);
          }}
        />
      )}
    </div>
  );
}

// Quiz Question Component
function QuizQuestion({ question, index, onEdit, onDelete }: any) {
  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'Multiple Choice';
      case 'true_false': return 'True/False';
      case 'short_answer': return 'Short Answer';
      case 'fill_blank': return 'Fill in the Blank';
      case 'matching': return 'Matching';
      case 'essay': return 'Essay';
      default: return type;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {getQuestionTypeLabel(question.type)}
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {question.points} pts
            </span>
          </div>
          <p className="text-gray-900 mb-3">{question.question || 'Question text...'}</p>
          
          {/* Display options for multiple choice and true/false questions */}
          {(question.type === 'multiple_choice' || question.type === 'true_false') && question.options && (
            <div className="space-y-2">
              {question.options.map((option, optIndex) => (
                <div key={optIndex} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={question.correctAnswer === option}
                    disabled
                    className="text-blue-600 border-gray-300"
                  />
                  <span className={`text-sm ${question.correctAnswer === option ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                    {option || `Option ${optIndex + 1}`}
                  </span>
                  {question.correctAnswer === option && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Correct</span>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Display correct answer for other question types */}
          {question.type !== 'multiple_choice' && question.type !== 'true_false' && question.correctAnswer && (
            <div className="mt-2">
              <span className="text-sm text-gray-500">Correct Answer: </span>
              <span className="text-sm font-medium text-green-600">{question.correctAnswer}</span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Quiz Builder Component
function QuizBuilder({ question, onSave, onCancel }: any) {
  const [editingQuestion, setEditingQuestion] = useState({
    id: question?.id || '',
    type: question?.type || 'multiple_choice',
    question: question?.question || '',
    options: question?.options || ['', '', '', ''],
    correctAnswer: question?.correctAnswer || '',
    explanation: question?.explanation || '',
    points: question?.points || 1,
    required: question?.required !== undefined ? question.required : true
  });

  // Update editingQuestion when question prop changes
  useEffect(() => {
    if (question) {
      setEditingQuestion({
        id: question.id || '',
        type: question.type || 'multiple_choice',
        question: question.question || '',
        options: question.type === 'true_false' ? ['True', 'False'] : (question.options || ['', '', '', '']),
        correctAnswer: question.correctAnswer || '',
        explanation: question.explanation || '',
        points: question.points || 1,
        required: question.required !== undefined ? question.required : true
      });
    }
  }, [question]);

  const handleSave = () => {
    onSave(editingQuestion);
  };

  const addOption = () => {
    setEditingQuestion({
      ...editingQuestion,
      options: [...(editingQuestion.options || []), '']
    });
  };

  const removeOption = (index: number) => {
    const newOptions = editingQuestion.options?.filter((_, i) => i !== index) || [];
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(editingQuestion.options || [])];
    newOptions[index] = value;
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  const setCorrectAnswer = (answer: string) => {
    setEditingQuestion({ ...editingQuestion, correctAnswer: answer });
  };

  const setCorrectAnswers = (answers: string[]) => {
    setEditingQuestion({ ...editingQuestion, correctAnswer: answers });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Edit Question</h3>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type
              </label>
              <select
                value={editingQuestion.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  let newOptions = editingQuestion.options;
                  
                  // Initialize options based on question type
                  if (newType === 'true_false') {
                    newOptions = ['True', 'False'];
                  } else if (newType === 'multiple_choice') {
                    newOptions = ['', '', '', ''];
                  } else {
                    newOptions = [];
                  }
                  
                  setEditingQuestion({ 
                    ...editingQuestion, 
                    type: newType,
                    options: newOptions,
                    correctAnswer: '' // Reset correct answer when type changes
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="short_answer">Short Answer</option>
                <option value="matching">Matching</option>
                <option value="essay">Essay</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text *
              </label>
              <textarea
                value={editingQuestion.question}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your question..."
              />
            </div>

            {/* Options for Multiple Choice */}
            {editingQuestion.type === 'multiple_choice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options
                </label>
                <div className="space-y-2">
                  {editingQuestion.options?.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        value={option}
                        checked={editingQuestion.correctAnswer === option}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        className="text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Option ${index + 1}`}
                      />
                      <button
                        onClick={() => removeOption(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addOption}
                    className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-300 w-full"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add Option
                  </button>
                </div>
              </div>
            )}

            {/* True/False Options */}
            {editingQuestion.type === 'true_false' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correct Answer
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="correctAnswer"
                      value="True"
                      checked={editingQuestion.correctAnswer === 'True'}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">True</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="correctAnswer"
                      value="False"
                      checked={editingQuestion.correctAnswer === 'False'}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">False</span>
                  </label>
                </div>
              </div>
            )}



            {/* Matching */}
            {editingQuestion.type === 'matching' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Matching Pairs
                </label>
                <div className="space-y-2">
                  {editingQuestion.options?.map((option, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Left item ${index + 1}`}
                      />
                      <input
                        type="text"
                        value={editingQuestion.correctAnswer?.[index] || ''}
                        onChange={(e) => {
                          const answers = [...(editingQuestion.correctAnswer as string[] || [])];
                          answers[index] = e.target.value;
                          setCorrectAnswers(answers);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Right item ${index + 1}`}
                      />
                    </div>
                  ))}
                  <button
                    onClick={addOption}
                    className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-300 w-full"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add Matching Pair
                  </button>
                </div>
              </div>
            )}

            {/* Short Answer and Essay */}
            {(editingQuestion.type === 'short_answer' || editingQuestion.type === 'essay') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sample Answer (Optional)
                </label>
                <textarea
                  value={editingQuestion.correctAnswer || ''}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Provide a sample answer for grading reference"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points
                </label>
                <input
                  type="number"
                  value={editingQuestion.points}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, points: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required
                </label>
                <select
                  value={editingQuestion.required ? 'true' : 'false'}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation (Optional)
              </label>
              <textarea
                value={editingQuestion.explanation || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Explain the correct answer..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Preview Tab Component
function PreviewTab({ courseData, contentBlocks, quizzes }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Preview</h3>
        
        {/* Course Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
          {courseData.thumbnail && (
            <img 
              src={courseData.thumbnail} 
              alt="Course thumbnail" 
              className="w-32 h-32 object-cover rounded-xl mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">{courseData.title}</h1>
          <p className="text-gray-600 text-center mb-4">{courseData.description}</p>
          <div className="flex justify-center space-x-4 text-sm text-gray-500">
            <span>Category: {courseData.category}</span>
            <span>Level: {courseData.level}</span>
            <span>Price: ${courseData.price}</span>
          </div>
        </div>

        {/* Requirements */}
        {courseData.requirements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Prerequisites</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {courseData.requirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Learning Outcomes */}
        {courseData.learningOutcomes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">What You'll Learn</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {courseData.learningOutcomes.map((outcome, index) => (
                <li key={index}>{outcome}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Content Preview */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Course Content</h3>
          <div className="space-y-3">
            {contentBlocks.map((block, index) => (
              <div key={block.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {block.type}
                  </span>
                  <h4 className="font-medium text-gray-900">{block.title}</h4>
                </div>
                
                {block.type === 'text' && (
                  <div 
                    className="text-gray-700 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: block.content }}
                  />
                )}
                
                {block.type === 'image' && block.content && (
                  <div className="text-center">
                    <img 
                      src={block.content} 
                      alt={block.title}
                      className="max-w-full h-auto rounded-lg"
                      style={{
                        width: block.metadata?.imageWidth || 'auto',
                        height: block.metadata?.imageHeight || 'auto'
                      }}
                    />
                    {(block.metadata?.imageWidth || block.metadata?.imageHeight) && (
                      <p className="text-xs text-gray-500 mt-2">
                        Custom size: {block.metadata.imageWidth || 'auto'} × {block.metadata.imageHeight || 'auto'}
                      </p>
                    )}
                  </div>
                )}
                
                {block.type === 'video' && block.content && (
                  <div className="aspect-video">
                    {block.content.includes('youtube.com') || block.content.includes('youtu.be') ? (
                      <iframe
                        src={block.content.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    ) : (
                      <video controls className="w-full h-full rounded-lg">
                        <source src={block.content} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                )}
                
                {block.type === 'file' && block.content && (
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">{block.title}</span>
                    <a 
                      href={block.content} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Download
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Assessment Preview */}
        {quizzes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Assessments</h3>
            <div className="space-y-4">
              {quizzes.map((quiz, index) => (
                <div key={quiz.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {quiz.type}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {quiz.points} pts
                    </span>
                  </div>
                  
                  <p className="text-gray-900 mb-3">{quiz.question}</p>
                  
                  {quiz.options && quiz.options.length > 0 && (
                    <div className="space-y-2">
                      {quiz.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            name={`quiz-${quiz.id}`} 
                            disabled 
                            className="text-blue-600 border-gray-300"
                          />
                          <span className="text-gray-700">{option}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {quiz.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Explanation:</strong> {quiz.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Assignments Tab Component
function AssignmentsTab({ 
  assignments, 
  setAssignments, 
  addAssignment, 
  updateAssignment, 
  deleteAssignment,
  editingAssignment,
  setEditingAssignment,
  showAssignmentBuilder,
  setShowAssignmentBuilder
}: {
  assignments: Assignment[];
  setAssignments: (assignments: Assignment[]) => void;
  addAssignment: () => void;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  editingAssignment: Assignment | null;
  setEditingAssignment: (assignment: Assignment | null) => void;
  showAssignmentBuilder: boolean;
  setShowAssignmentBuilder: (show: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Assignments</h2>
          <p className="text-gray-600 mt-2">Create and manage assignments for your students</p>
        </div>
        <button
          onClick={addAssignment}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Assignment
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
          <p className="text-gray-500 mb-4">Create your first assignment to get started</p>
          <button
            onClick={addAssignment}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{assignment.title}</h3>
                  <p className="text-gray-600 mb-3">{assignment.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 text-gray-900 capitalize">{assignment.assignmentType}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Points:</span>
                      <span className="ml-2 text-gray-900">{assignment.maxPoints}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Due Date:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Difficulty:</span>
                      <span className="ml-2 text-gray-900 capitalize">{assignment.difficulty}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => {
                      setEditingAssignment(assignment);
                      setShowAssignmentBuilder(true);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteAssignment(assignment.id)}
                    className="p-2 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Builder Modal */}
      {showAssignmentBuilder && editingAssignment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAssignment.id ? 'Edit Assignment' : 'Create Assignment'}
              </h3>
              <button
                onClick={() => {
                  setShowAssignmentBuilder(false);
                  setEditingAssignment(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editingAssignment.title}
                  onChange={(e) => setEditingAssignment({
                    ...editingAssignment,
                    title: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingAssignment.description}
                  onChange={(e) => setEditingAssignment({
                    ...editingAssignment,
                    description: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Type
                  </label>
                  <select
                    value={editingAssignment.assignmentType}
                    onChange={(e) => setEditingAssignment({
                      ...editingAssignment,
                      assignmentType: e.target.value as any
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="essay">Essay</option>
                    <option value="quiz">Quiz</option>
                    <option value="project">Project</option>
                    <option value="presentation">Presentation</option>
                    <option value="analysis">Analysis</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={editingAssignment.difficulty}
                    onChange={(e) => setEditingAssignment({
                      ...editingAssignment,
                      difficulty: e.target.value as any
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Points
                  </label>
                  <input
                    type="number"
                    value={editingAssignment.maxPoints}
                    onChange={(e) => setEditingAssignment({
                      ...editingAssignment,
                      maxPoints: parseInt(e.target.value) || 0
                    })}
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passing Score
                  </label>
                  <input
                    type="number"
                    value={editingAssignment.passingScore}
                    onChange={(e) => setEditingAssignment({
                      ...editingAssignment,
                      passingScore: parseInt(e.target.value) || 0
                    })}
                    min="0"
                    max={editingAssignment.maxPoints}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={editingAssignment.dueDate.slice(0, 16)}
                  onChange={(e) => setEditingAssignment({
                    ...editingAssignment,
                    dueDate: new Date(e.target.value).toISOString()
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions
                </label>
                <textarea
                  value={editingAssignment.instructions || ''}
                  onChange={(e) => setEditingAssignment({
                    ...editingAssignment,
                    instructions: e.target.value
                  })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingAssignment.isPublished}
                    onChange={(e) => setEditingAssignment({
                      ...editingAssignment,
                      isPublished: e.target.checked
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Publish Assignment</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingAssignment.allowLateSubmission}
                    onChange={(e) => setEditingAssignment({
                      ...editingAssignment,
                      allowLateSubmission: e.target.checked
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow Late Submission</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowAssignmentBuilder(false);
                    setEditingAssignment(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateAssignment(editingAssignment.id, editingAssignment);
                    setShowAssignmentBuilder(false);
                    setEditingAssignment(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Save Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export with dynamic import to prevent hydration issues
export default dynamic(() => Promise.resolve(CourseCreatorClient), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading course creator...</p>
      </div>
    </div>
  )
});
