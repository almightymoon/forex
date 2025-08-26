'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Calendar, 
  Clock, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Search,
  Filter,
  Bell,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Image,
  Video,
  Link,
  BookOpen
} from 'lucide-react';
import { showToast } from '@/utils/toast';

interface Message {
  _id: string;
  title: string;
  content: string;
  type: 'announcement' | 'message' | 'notification';
  recipients: Array<{
    studentId: string;
    studentName: string;
    email: string;
    read: boolean;
    readAt?: string;
  }>;
  courseId?: string;
  courseName?: string;
  scheduledFor?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  attachments: Array<{
    name: string;
    url: string;
    type: 'file' | 'image' | 'video' | 'link';
  }>;
  createdAt: string;
  sentAt?: string;
  readCount: number;
  totalRecipients: number;
}

interface CreateMessageData {
  title: string;
  content: string;
  type: 'announcement' | 'message' | 'notification';
  recipients: string[];
  courseId?: string;
  scheduledFor?: string;
  attachments: Array<{
    name: string;
    url: string;
    type: 'file' | 'image' | 'video' | 'link';
  }>;
}

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  enrolledCourses: string[];
}

interface Course {
  _id: string;
  title: string;
  enrolledStudents: string[];
}

export default function Communication() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState<CreateMessageData>({
    title: '',
    content: '',
    type: 'announcement',
    recipients: [],
    courseId: '',
    scheduledFor: '',
    attachments: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [newAttachment, setNewAttachment] = useState({
    name: '',
    url: '',
    type: 'file' as const
  });

  useEffect(() => {
    fetchMessages();
    fetchStudents();
    fetchCourses();
  }, []);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch('http://localhost:4000/api/teacher/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        showToast('Failed to fetch messages', 'error');
      }
    } catch (error) {
      showToast('Error fetching messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/teacher/students');
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/teacher/courses');
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleCreateMessage = async () => {
    if (!newMessage.title || !newMessage.content || newMessage.recipients.length === 0) {
      showToast('Please fill in all required fields and select recipients', 'error');
      return;
    }

    try {
      const response = await fetch('http://localhost:4000/api/teacher/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMessage),
      });

      if (response.ok) {
        showToast('Message created successfully', 'success');
        setShowCreateModal(false);
        setNewMessage({
          title: '',
          content: '',
          type: 'announcement',
          recipients: [],
          courseId: '',
          scheduledFor: '',
          attachments: []
        });
        setSelectedRecipients([]);
        fetchMessages();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to create message', 'error');
      }
    } catch (error) {
      showToast('Error creating message', 'error');
    }
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage) return;

    try {
      const response = await fetch(`http://localhost:4000/api/teacher/messages/${editingMessage._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingMessage),
      });

      if (response.ok) {
        showToast('Message updated successfully', 'success');
        setShowEditModal(false);
        setEditingMessage(null);
        fetchMessages();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to update message', 'error');
      }
    } catch (error) {
      showToast('Error updating message', 'error');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const response = await fetch(`http://localhost:4000/api/teacher/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Message deleted successfully', 'success');
        fetchMessages();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete message', 'error');
      }
    } catch (error) {
      showToast('Error deleting message', 'error');
    }
  };

  const handleSendNow = async (messageId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/teacher/messages/${messageId}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        showToast('Message sent successfully', 'success');
        fetchMessages();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to send message', 'error');
      }
    } catch (error) {
      showToast('Error sending message', 'error');
    }
  };

  const addAttachment = () => {
    if (newAttachment.name && newAttachment.url) {
      setNewMessage({
        ...newMessage,
        attachments: [...newMessage.attachments, { ...newAttachment }]
      });
      setNewAttachment({ name: '', url: '', type: 'file' });
    }
  };

  const removeAttachment = (index: number) => {
    setNewMessage({
      ...newMessage,
      attachments: newMessage.attachments.filter((_, i) => i !== index)
    });
  };

  const selectRecipientsByCourse = (courseId: string) => {
    const course = courses.find(c => c._id === courseId);
    if (course) {
      const courseStudents = students.filter(student => 
        student.enrolledCourses.includes(courseId)
      );
      setSelectedRecipients(courseStudents.map(s => s._id));
      setNewMessage({
        ...newMessage,
        courseId,
        recipients: courseStudents.map(s => s._id)
      });
    }
  };

  const selectAllStudents = () => {
    const allStudentIds = students.map(s => s._id);
    setSelectedRecipients(allStudentIds);
    setNewMessage({
      ...newMessage,
      recipients: allStudentIds
    });
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = 
      message.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || message.type === filterType;
    const matchesStatus = filterStatus === 'all' || message.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Bell className="w-4 h-4" />;
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'notification': return <AlertCircle className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Communication Center</h2>
          <p className="text-gray-600">Send announcements, messages, and notifications to your students</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Message</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Send className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-gray-900">
                {messages.filter(m => m.status === 'sent').length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Recipients</p>
              <p className="text-2xl font-bold text-gray-900">
                {messages.reduce((total, message) => total + message.totalRecipients, 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Eye className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Read Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {messages.length > 0 
                  ? Math.round(
                      messages.reduce((total, message) => total + message.readCount, 0) / 
                      messages.reduce((total, message) => total + message.totalRecipients, 0) * 100
                    )
                  : 0}%
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="announcement">Announcements</option>
              <option value="message">Messages</option>
              <option value="notification">Notifications</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Drafts</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMessages.map((message, index) => (
          <motion.div
            key={message._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getTypeIcon(message.type)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                      {message.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{message.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-3">{message.content}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  {message.totalRecipients} recipients
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Eye className="w-4 h-4 mr-2" />
                  {message.readCount} read
                </div>
                {message.courseName && (
                  <div className="flex items-center text-sm text-gray-600">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {message.courseName}
                  </div>
                )}
                {message.scheduledFor && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(message.scheduledFor).toLocaleDateString()}
                  </div>
                )}
              </div>

              {message.attachments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Attachments:</p>
                  <div className="flex flex-wrap gap-1">
                    {message.attachments.slice(0, 3).map((attachment, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        {attachment.name}
                      </span>
                    ))}
                    {message.attachments.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        +{message.attachments.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {message.status === 'draft' && (
                  <>
                    <button
                      onClick={() => {
                        setEditingMessage(message);
                        setShowEditModal(true);
                      }}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleSendNow(message._id)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                      title="Send Now"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </>
                )}

                {message.status === 'scheduled' && (
                  <button
                    onClick={() => handleSendNow(message._id)}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                  >
                    Send Now
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedMessage(message);
                    setShowPreviewModal(true);
                  }}
                  className="px-3 py-2 text-blue-600 hover:text-blue-900 transition-colors"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteMessage(message._id)}
                  className="px-3 py-2 text-red-600 hover:text-red-900 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Message Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Message</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Type *
                  </label>
                  <select
                    value={newMessage.type}
                    onChange={(e) => setNewMessage({ ...newMessage, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="message">Message</option>
                    <option value="notification">Notification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course (Optional)
                  </label>
                  <select
                    value={newMessage.courseId}
                    onChange={(e) => {
                      setNewMessage({ ...newMessage, courseId: e.target.value });
                      if (e.target.value) {
                        selectRecipientsByCourse(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Students</option>
                    {courses.map(course => (
                      <option key={course._id} value={course._id}>{course.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newMessage.title}
                  onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter message title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter message content"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipients *
                </label>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAllStudents}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
                    >
                      Select All Students
                    </button>
                    {newMessage.courseId && (
                      <button
                        onClick={() => selectRecipientsByCourse(newMessage.courseId!)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        Select Course Students
                      </button>
                    )}
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {students.map(student => (
                      <label key={student._id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(student._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecipients([...selectedRecipients, student._id]);
                              setNewMessage({
                                ...newMessage,
                                recipients: [...newMessage.recipients, student._id]
                              });
                            } else {
                              setSelectedRecipients(selectedRecipients.filter(id => id !== student._id));
                              setNewMessage({
                                ...newMessage,
                                recipients: newMessage.recipients.filter(id => id !== student._id)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {student.firstName} {student.lastName} ({student.email})
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    Selected: {selectedRecipients.length} students
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={newMessage.scheduledFor}
                  onChange={(e) => setNewMessage({ ...newMessage, scheduledFor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments
                </label>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newAttachment.name}
                      onChange={(e) => setNewAttachment({ ...newAttachment, name: e.target.value })}
                      placeholder="Attachment name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={newAttachment.url}
                      onChange={(e) => setNewAttachment({ ...newAttachment, url: e.target.value })}
                      placeholder="URL"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={newAttachment.type}
                      onChange={(e) => setNewAttachment({ ...newAttachment, type: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="file">File</option>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="link">Link</option>
                    </select>
                    <button
                      onClick={addAttachment}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newMessage.attachments.map((attachment, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {attachment.name}
                        <button
                          onClick={() => removeAttachment(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMessage}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {newMessage.scheduledFor ? 'Schedule Message' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {showEditModal && editingMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Message</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={editingMessage.title}
                  onChange={(e) => setEditingMessage({ ...editingMessage, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={editingMessage.content}
                  onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMessage}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Message Preview</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{selectedMessage.title}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Type: {selectedMessage.type} | Status: {selectedMessage.status}
                </p>
              </div>

              <div>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>

              {selectedMessage.attachments.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Attachments:</h5>
                  <div className="space-y-2">
                    {selectedMessage.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        {attachment.type === 'image' && <Image className="w-4 h-4 text-blue-600" />}
                        {attachment.type === 'video' && <Video className="w-4 h-4 text-purple-600" />}
                        {attachment.type === 'link' && <Link className="w-4 h-4 text-green-600" />}
                        {attachment.type === 'file' && <FileText className="w-4 h-4 text-gray-600" />}
                        <span className="text-sm text-gray-700">{attachment.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h5 className="font-medium text-gray-900 mb-2">Recipients:</h5>
                <p className="text-sm text-gray-600">
                  {selectedMessage.totalRecipients} students
                  {selectedMessage.courseName && ` • Course: ${selectedMessage.courseName}`}
                </p>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-2">Stats:</h5>
                <p className="text-sm text-gray-600">
                  Read: {selectedMessage.readCount}/{selectedMessage.totalRecipients} 
                  ({Math.round((selectedMessage.readCount / selectedMessage.totalRecipients) * 100)}%)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
