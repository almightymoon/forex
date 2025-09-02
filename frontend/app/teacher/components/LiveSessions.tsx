'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Video, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff,
  Share,
  Settings,
  Edit,
  Trash2,
  Eye,
  XCircle,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { showToast } from '@/utils/toast';

interface LiveSession {
  _id: string;
  title: string;
  description: string;
  teacher: string;
  scheduledAt: string; // Changed from scheduledDate to match backend
  duration: number; // in minutes
  maxParticipants: number;
  currentParticipants: Array<{
    student: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    bookedAt: string;
    attended: boolean;
    joinedAt?: string;
    leftAt?: string;
    totalWatchTime: number;
  }>;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'rescheduled';
  meetingLink?: string;
  recordingUrl?: string;
  price: number;
  currency: string;
  isFree: boolean;
  category: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'options' | 'futures' | 'general' | 'qa';
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  tags: string[];
  topics: string[];
  materials: Array<{
    title: string;
    description: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  chatEnabled: boolean;
  recordingEnabled: boolean;
  isReplayAvailable: boolean;
  replayExpiry?: string;
  timezone: string;
  reminderSent: boolean;
  reminderSentAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  participantCount?: number;
  availableSpots?: number;
  isFull?: boolean;
  isUpcoming?: boolean;
  isLive?: boolean;
  isCompleted?: boolean;
  formattedPrice?: string;
  formattedDuration?: string;
}

interface CreateSessionData {
  title: string;
  description: string;
  scheduledAt: string; // Changed from scheduledDate
  duration: number;
  maxParticipants: number;
  category: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'options' | 'futures' | 'general' | 'qa';
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  tags: string[];
  topics: string[];
  price: number;
  currency: string;
  isFree: boolean;
  meetingLink?: string;
  timezone?: string;
  chatEnabled: boolean;
  recordingEnabled: boolean;
  isReplayAvailable: boolean;
  notes?: string;
}

export default function LiveSessions() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [newSession, setNewSession] = useState<CreateSessionData>({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60,
    maxParticipants: 50,
    category: 'general',
    level: 'all',
    tags: [],
    topics: [],
    price: 0,
    currency: 'USD',
    isFree: false,
    meetingLink: '',
    timezone: 'Asia/Karachi',
    chatEnabled: true,
    recordingEnabled: true,
    isReplayAvailable: false,
    notes: '',
  });
  const [newTopic, setNewTopic] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch('http://localhost:4000/api/teacher/live-sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Live sessions response:', data); // Debug log
        setSessions(data.data || []);
      } else {
        showToast('Failed to fetch live sessions', 'error');
      }
    } catch (error) {
      showToast('Error fetching live sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.title || !newSession.description || !newSession.scheduledAt) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch('http://localhost:4000/api/teacher/live-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSession),
      });

      if (response.ok) {
        showToast('Live session created successfully', 'success');
        setShowCreateModal(false);
        setNewSession({
          title: '',
          description: '',
          scheduledAt: '',
          duration: 60,
          maxParticipants: 50,
          category: 'general',
          level: 'all',
          tags: [],
          topics: [],
          price: 0,
          currency: 'USD',
          isFree: false,
          meetingLink: '',
          timezone: 'Asia/Karachi',
          chatEnabled: true,
          recordingEnabled: true,
          isReplayAvailable: false,
          notes: '',
        });
        fetchSessions();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to create session', 'error');
      }
    } catch (error) {
      showToast('Error creating session', 'error');
    }
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/live-sessions/${editingSession._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingSession),
      });

      if (response.ok) {
        showToast('Session updated successfully', 'success');
        setShowEditModal(false);
        setEditingSession(null);
        fetchSessions();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to update session', 'error');
      }
    } catch (error) {
      showToast('Error updating session', 'error');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/live-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Session deleted successfully', 'success');
        fetchSessions();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete session', 'error');
      }
    } catch (error) {
      showToast('Error deleting session', 'error');
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/live-sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Session started successfully', 'success');
        fetchSessions();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to start session', 'error');
      }
    } catch (error) {
      showToast('Error starting session', 'error');
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/live-sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Session ended successfully', 'success');
        fetchSessions();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to end session', 'error');
      }
    } catch (error) {
      showToast('Error ending session', 'error');
    }
  };

  const handleToggleRecording = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/live-sessions/${sessionId}/recording`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Recording toggled successfully', 'success');
        fetchSessions();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to toggle recording', 'error');
      }
    } catch (error) {
      showToast('Error toggling recording', 'error');
    }
  };

  const generateGoogleMeetLink = () => {
    // Create a unique meeting room ID for our own system
    const roomId = Math.random().toString(36).substring(2, 15);
    const meetingUrl = `${window.location.origin}/meeting/${roomId}`;
    
    setNewSession({ ...newSession, meetingLink: meetingUrl });
    showToast('Meeting room created! You can now share this link with participants.', 'success');
  };

  const createExternalMeetingLink = () => {
    // Create a link to an external meeting service (Zoom, Teams, etc.)
    const externalUrl = prompt('Enter external meeting URL (Zoom, Teams, etc.):');
    if (externalUrl) {
      setNewSession({ ...newSession, meetingLink: externalUrl });
      showToast('External meeting link added!', 'success');
    }
  };

  const copyMeetingLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      showToast('Meeting link copied to clipboard!', 'success');
    } catch (error) {
      showToast('Failed to copy link', 'error');
    }
  };

  const createMeetingRoom = () => {
    // Create a unique meeting room ID
    const roomId = Math.random().toString(36).substring(2, 15);
    const meetingUrl = `${window.location.origin}/meeting/${roomId}`;
    
    // Update the session with the meeting room URL
    if (selectedSession) {
      // You can implement this to update the session in the backend
      showToast('Meeting room created!', 'success');
    }
    
    return meetingUrl;
  };

  const startMeetingSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      // Update session status to 'live' and start the meeting
      const response = await fetch(`http://localhost:4000/api/teacher/live-sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Meeting session started!', 'success');
        fetchSessions(); // Refresh the sessions list
        setShowMeetingModal(false); // Close the modal
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to start meeting session', 'error');
      }
    } catch (error) {
      showToast('Error starting meeting session', 'error');
    }
  };

  const addTopic = () => {
    if (newTopic.trim() && !newSession.topics.includes(newTopic.trim())) {
      setNewSession({
        ...newSession,
        topics: [...newSession.topics, newTopic.trim()]
      });
      setNewTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    setNewSession({
      ...newSession,
      topics: newSession.topics.filter(t => t !== topic)
    });
  };

  const addTag = () => {
    if (newTag.trim() && !newSession.tags.includes(newTag.trim())) {
      setNewSession({
        ...newSession,
        tags: [...newSession.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setNewSession({
      ...newSession,
      tags: newSession.tags.filter(t => t !== tag)
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="w-4 h-4" />;
      case 'live': return <Play className="w-4 h-4" />;
      case 'completed': return <Square className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'rescheduled': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live Sessions</h2>
          <p className="text-gray-600 dark:text-gray-300">Create and manage live interactive sessions with students</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Session</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Video className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{sessions.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Play className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Live Now</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {sessions.filter(s => s.status === 'live').length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Participants</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {sessions.reduce((total, session) => total + session.currentParticipants.length, 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {sessions.filter(s => s.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <CheckCircle className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {sessions.filter(s => s.status === 'completed').length}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session, index) => (
          <motion.div
            key={session._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{session.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{session.description}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                  {getStatusIcon(session.status)}
                  <span className="ml-1 capitalize">{session.status}</span>
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(session.scheduledAt).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {session.duration} minutes
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  {session.currentParticipants.length}/{session.maxParticipants} participants
                </div>
                {session.status === 'live' && (
                  <div className="flex items-center text-sm text-red-600 font-medium">
                    <Play className="w-4 h-4 mr-2" />
                    LIVE NOW - Students can join!
                  </div>
                )}
                {session.status === 'completed' && (
                  <div className="flex items-center text-sm text-gray-600 font-medium">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    COMPLETED - Can be deleted
                  </div>
                )}
              </div>



              {session.topics.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Topics:</p>
                  <div className="flex flex-wrap gap-1">
                    {session.topics.slice(0, 3).map((topic, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        {topic}
                      </span>
                    ))}
                    {session.topics.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        +{session.topics.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {session.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => handleStartSession(session._id)}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                    >
                      Start Session
                    </button>
                    <button
                      onClick={() => {
                        setEditingSession(session);
                        setShowEditModal(true);
                      }}
                      className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                      title="Edit Session"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </>
                )}

                                {session.meetingLink && (
                  <button
                    onClick={() => {
                      setSelectedSession(session);
                      setShowMeetingModal(true);
                    }}
                    className={`px-3 py-2 text-white text-sm rounded-lg transition-colors ${
                      session.meetingLink.includes(window.location.origin) 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                    title={session.meetingLink.includes(window.location.origin) ? 'Join Meeting Room' : 'Join External Meeting'}
                  >
                    <Video className="w-4 h-4" />
                  </button>
                )}

                {session.status === 'live' && (
                  <>
                    <button
                      onClick={() => handleEndSession(session._id)}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                    >
                      End Session
                    </button>
                    <button
                                              onClick={() => handleToggleRecording(session._id)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                         session.recordingEnabled 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                       title={session.recordingEnabled ? 'Stop Recording' : 'Start Recording'}
                      >
                       {session.recordingEnabled ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setSelectedSession(session);
                    setShowParticipantsModal(true);
                  }}
                  className="px-3 py-2 text-blue-600 hover:text-blue-900 transition-colors"
                  title="View Participants"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {(session.status === 'scheduled' || session.status === 'cancelled' || session.status === 'completed') && (
                  <button
                    onClick={() => handleDeleteSession(session._id)}
                    className="px-3 py-2 text-red-600 hover:text-red-900 transition-colors"
                    title="Delete Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create New Live Session</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Session Title *
                </label>
                <input
                  type="text"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter session title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={newSession.description}
                  onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter session description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scheduled Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newSession.scheduledAt}
                    onChange={(e) => setNewSession({ ...newSession, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={newSession.duration}
                    onChange={(e) => setNewSession({ ...newSession, duration: parseInt(e.target.value) })}
                    min="15"
                    max="480"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Participants
                  </label>
                  <input
                    type="number"
                    value={newSession.maxParticipants}
                    onChange={(e) => setNewSession({ ...newSession, maxParticipants: parseInt(e.target.value) })}
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={newSession.category}
                    onChange={(e) => setNewSession({ ...newSession, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="general">General</option>
                    <option value="forex">Forex</option>
                    <option value="crypto">Crypto</option>
                    <option value="stocks">Stocks</option>
                    <option value="commodities">Commodities</option>
                    <option value="options">Options</option>
                    <option value="futures">Futures</option>
                    <option value="qa">Q&A</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level *
                  </label>
                  <select
                    value={newSession.level}
                    onChange={(e) => setNewSession({ ...newSession, level: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (USD)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={newSession.price}
                      onChange={(e) => setNewSession({ ...newSession, price: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newSession.isFree}
                        onChange={(e) => setNewSession({ ...newSession, isFree: e.target.checked })}
                        className="mr-2"
                      />
                      Free
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Room Link
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={newSession.meetingLink || ''}
                    onChange={(e) => setNewSession({ ...newSession, meetingLink: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter meeting room URL or click Create Room"
                  />
                  <button
                    type="button"
                    onClick={generateGoogleMeetLink}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    Create Room
                  </button>
                  <button
                    type="button"
                    onClick={createExternalMeetingLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Add External Link
                  </button>
                </div>
              </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={newSession.timezone || 'Asia/Karachi'}
                    onChange={(e) => setNewSession({ ...newSession, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newSession.chatEnabled}
                    onChange={(e) => setNewSession({ ...newSession, chatEnabled: e.target.checked })}
                    className="mr-2"
                  />
                  Chat Enabled
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newSession.recordingEnabled}
                    onChange={(e) => setNewSession({ ...newSession, recordingEnabled: e.target.checked })}
                    className="mr-2"
                  />
                  Recording Enabled
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newSession.isReplayAvailable}
                    onChange={(e) => setNewSession({ ...newSession, isReplayAvailable: e.target.checked })}
                    className="mr-2"
                  />
                  Replay Available
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newSession.notes || ''}
                  onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes for the session"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topics
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add a topic"
                  />
                  <button
                    onClick={addTopic}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newSession.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {topic}
                      <button
                        onClick={() => removeTopic(topic)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add a tag"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newSession.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
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
                onClick={handleCreateSession}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {showEditModal && editingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Live Session</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Title *
                </label>
                <input
                  type="text"
                  value={editingSession.title}
                  onChange={(e) => setEditingSession({ ...editingSession, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={editingSession.description}
                  onChange={(e) => setEditingSession({ ...editingSession, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={editingSession.scheduledAt}
                    onChange={(e) => setEditingSession({ ...editingSession, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={editingSession.duration}
                    onChange={(e) => setEditingSession({ ...editingSession, duration: parseInt(e.target.value) })}
                    min="15"
                    max="480"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Participants
                </label>
                <input
                  type="number"
                  value={editingSession.maxParticipants}
                  onChange={(e) => setEditingSession({ ...editingSession, maxParticipants: parseInt(e.target.value) })}
                  min="1"
                  max="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Room Link
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={editingSession.meetingLink || ''}
                    onChange={(e) => setEditingSession({ ...editingSession, meetingLink: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter meeting room URL or click Create Room"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const roomId = Math.random().toString(36).substring(2, 15);
                      const meetingUrl = `${window.location.origin}/meeting/${roomId}`;
                      setEditingSession({ ...editingSession, meetingLink: meetingUrl });
                      showToast('Meeting room created! You can now share this link with participants.', 'success');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    Create Room
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const externalUrl = prompt('Enter external meeting URL (Zoom, Teams, etc.):');
                      if (externalUrl) {
                        setEditingSession({ ...editingSession, meetingLink: externalUrl });
                        showToast('External meeting link added!', 'success');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Add External Link
                  </button>
                </div>
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
                onClick={handleUpdateSession}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipantsModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Participants: {selectedSession.title}
              </h3>
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedSession.currentParticipants.length > 0 ? (
                selectedSession.currentParticipants.map((participant, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {participant.student?.firstName ? participant.student.firstName.charAt(0).toUpperCase() : '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {participant.student?.firstName ? `${participant.student.firstName} ${participant.student.lastName}` : 'Unknown Student'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Joined: {new Date(participant.joinedAt || participant.bookedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {participant.attended ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Left
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No participants yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meeting Modal */}
      {showMeetingModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                Live Session: {selectedSession.title}
              </h3>
              <div className="flex items-center space-x-2">
                {selectedSession.meetingLink && (
                  <>
                    <button
                      onClick={() => copyMeetingLink(selectedSession.meetingLink)}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                      title="Copy meeting link"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => window.open(selectedSession.meetingLink, '_blank')}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      title="Open in new tab"
                    >
                      Open Tab
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowMeetingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="relative w-full h-[70vh] bg-gray-100 flex items-center justify-center">
              {selectedSession.meetingLink ? (
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Video className="w-12 h-12 text-blue-600" />
                  </div>
                  
                  {/* Check if it's an external meeting link or our internal meeting room */}
                  {selectedSession.meetingLink.includes(window.location.origin) ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-blue-800 text-sm">
                        <strong>Meeting Room Ready!</strong> You can now join the meeting room or share the link with participants.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-green-800 text-sm">
                        <strong>External Meeting Link!</strong> This will open in a new tab to the external meeting service.
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-2">
                      {selectedSession.meetingLink.includes(window.location.origin) 
                        ? 'Ready to join the meeting room?' 
                        : 'Ready to join the external meeting?'}
                    </h4>
                    <p className="text-gray-600 mb-6 max-w-md">
                      {selectedSession.meetingLink.includes(window.location.origin)
                        ? 'Click the button below to join the meeting room. You can also copy the link to share with participants.'
                        : 'Click the button below to join the external meeting. This will open in a new tab.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => window.open(selectedSession.meetingLink, '_blank')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                      >
                        <Video className="w-5 h-5" />
                        <span>
                          {selectedSession.meetingLink.includes(window.location.origin) 
                            ? 'Join Meeting Room' 
                            : 'Join External Meeting'}
                        </span>
                      </button>
                      <button
                        onClick={() => copyMeetingLink(selectedSession.meetingLink)}
                        className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center space-x-2"
                      >
                        <span>Copy Meeting Link</span>
                      </button>
                      {selectedSession.status === 'scheduled' && (
                        <button
                          onClick={() => startMeetingSession(selectedSession._id)}
                          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center space-x-2"
                        >
                          <Play className="w-5 h-5" />
                          <span>Start Session</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>No meeting room link available for this session.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p><strong>Duration:</strong> {selectedSession.duration} minutes</p>
                  <p><strong>Participants:</strong> {selectedSession.currentParticipants.length}/{selectedSession.maxParticipants}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setShowParticipantsModal(true);
                      setShowMeetingModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Participants
                  </button>
                  <button
                    onClick={() => setShowMeetingModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close Meeting
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
