'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Clock,
  BarChart3,
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Zap
} from 'lucide-react';
import { showToast } from '@/utils/toast';

interface TradingSignal {
  _id: string;
  symbol: string;
  instrumentType: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices' | 'futures';
  type: 'buy' | 'sell' | 'hold' | 'strong_buy' | 'strong_sell';
  // Current market prices (like MT5 quotes)
  currentBid: number;
  currentAsk: number;
  dailyHigh: number;
  dailyLow: number;
  priceChange: number;
  priceChangePercent: number;
  // Signal entry/exit prices
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  // Risk management
  riskRewardRatio?: number;
  positionSize?: number;
  maxRisk?: number;
  description: string;
  timeframe: string;
  confidence: number;
  status: 'active' | 'closed' | 'expired';
  isPublished: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn?: number;
  marketConditions: 'bullish' | 'bearish' | 'sideways' | 'volatile';
  technicalIndicators: Array<{
    name: string;
    value: string;
    signal: string;
  }>;
  tags: string[];
  views: number;
  likes: string[];
  comments: Array<{
    user: string;
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface CreateSignalData {
  symbol: string;
  instrumentType: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices' | 'futures';
  type: 'buy' | 'sell' | 'hold' | 'strong_buy' | 'strong_sell';
  // Current market prices (like MT5 quotes)
  currentBid: number;
  currentAsk: number;
  dailyHigh: number;
  dailyLow: number;
  priceChange: number;
  priceChangePercent: number;
  // Signal entry/exit prices
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  // Risk management
  positionSize?: number;
  maxRisk?: number;
  description: string;
  timeframe: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn?: number;
  marketConditions: 'bullish' | 'bearish' | 'sideways' | 'volatile';
  technicalIndicators: Array<{
    name: string;
    value: string;
    signal: string;
  }>;
  tags: string[];
}

export default function TradingSignals() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);
  const [editingSignal, setEditingSignal] = useState<TradingSignal | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [newSignal, setNewSignal] = useState<CreateSignalData>({
    symbol: '',
    instrumentType: 'forex',
    type: 'buy',
    currentBid: 0,
    currentAsk: 0,
    dailyHigh: 0,
    dailyLow: 0,
    priceChange: 0,
    priceChangePercent: 0,
    entryPrice: 0,
    targetPrice: 0,
    stopLoss: 0,
    positionSize: 0,
    maxRisk: 0,
    description: '',
    timeframe: '1h',
    confidence: 50,
    riskLevel: 'medium',
    marketConditions: 'sideways',
    technicalIndicators: [],
    tags: []
  });

  useEffect(() => {
    fetchSignals();
  }, []);

  const fetchSignals = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch('http://localhost:4000/api/signals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSignals(data);
      } else {
        showToast('Failed to fetch signals', 'error');
      }
    } catch (error) {
      showToast('Error fetching signals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSignal = async () => {
    try {
      // Validate required fields
      if (!newSignal.symbol || !newSignal.description || newSignal.entryPrice <= 0 || newSignal.targetPrice <= 0 || newSignal.stopLoss <= 0) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      // Validate price logic based on signal type
      if (newSignal.type === 'buy') {
        if (newSignal.targetPrice <= newSignal.entryPrice) {
          showToast('For BUY signals: Target price must be higher than entry price', 'error');
          return;
        }
        if (newSignal.stopLoss >= newSignal.entryPrice) {
          showToast('For BUY signals: Stop loss must be lower than entry price', 'error');
          return;
        }
      } else if (newSignal.type === 'sell') {
        if (newSignal.targetPrice >= newSignal.entryPrice) {
          showToast('For SELL signals: Target price must be lower than entry price', 'error');
          return;
        }
        if (newSignal.stopLoss <= newSignal.entryPrice) {
          showToast('For SELL signals: Stop loss must be higher than entry price', 'error');
          return;
        }
      }

      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch('http://localhost:4000/api/signals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSignal)
      });

      if (response.ok) {
        showToast('Trading signal created successfully', 'success');
        setShowCreateModal(false);
        setNewSignal({
          symbol: '',
          instrumentType: 'forex',
          type: 'buy',
          currentBid: 0,
          currentAsk: 0,
          dailyHigh: 0,
          dailyLow: 0,
          priceChange: 0,
          priceChangePercent: 0,
          entryPrice: 0,
          targetPrice: 0,
          stopLoss: 0,
          positionSize: 0,
          maxRisk: 0,
          description: '',
          timeframe: '1h',
          confidence: 50,
          riskLevel: 'medium',
          marketConditions: 'sideways',
          technicalIndicators: [],
          tags: []
        });
        fetchSignals();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to create signal', 'error');
      }
    } catch (error) {
      showToast('Error creating signal', 'error');
    }
  };

  const handleUpdateSignal = async () => {
    if (!editingSignal) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/signals/${editingSignal._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingSignal)
      });

      if (response.ok) {
        showToast('Trading signal updated successfully', 'success');
        setShowEditModal(false);
        setEditingSignal(null);
        fetchSignals();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to update signal', 'error');
      }
    } catch (error) {
      showToast('Error updating signal', 'error');
    }
  };

  const handleDeleteSignal = async (signalId: string) => {
    if (!confirm('Are you sure you want to delete this trading signal?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/signals/${signalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Trading signal deleted successfully', 'success');
        fetchSignals();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete signal', 'error');
      }
    } catch (error) {
      showToast('Error deleting signal', 'error');
    }
  };

  const handleTogglePublish = async (signalId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/signals/${signalId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPublished: !currentStatus })
      });

      if (response.ok) {
        showToast(`Signal ${!currentStatus ? 'published' : 'unpublished'} successfully`, 'success');
        fetchSignals();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to update signal', 'error');
      }
    } catch (error) {
      showToast('Error updating signal', 'error');
    }
  };

  const handleCloseSignal = async (signalId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/signals/${signalId}/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Signal closed successfully', 'success');
        fetchSignals();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to close signal', 'error');
      }
    } catch (error) {
      showToast('Error closing signal', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'buy': return 'bg-green-100 text-green-800';
      case 'sell': return 'bg-red-100 text-red-800';
      case 'hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trading Signals</h2>
          <p className="text-gray-600 dark:text-gray-300">Create and manage professional trading signals for your students</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'card'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-2 h-2 bg-current rounded-sm"></div>
                  <div className="w-2 h-2 bg-current rounded-sm"></div>
                  <div className="w-2 h-2 bg-current rounded-sm"></div>
                  <div className="w-2 h-2 bg-current rounded-sm"></div>
                </div>
                <span>Cards</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className="flex flex-col space-y-0.5">
                  <div className="w-4 h-1 bg-current rounded-sm"></div>
                  <div className="w-4 h-1 bg-current rounded-sm"></div>
                  <div className="w-4 h-1 bg-current rounded-sm"></div>
                </div>
                <span>List</span>
              </div>
            </button>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Signal</span>
          </button>
        </div>
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
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Signals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{signals.length}</p>
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
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {signals.filter(s => s.status === 'active').length}
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
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Views</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {signals.reduce((total, signal) => total + signal.views, 0)}
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
              <MessageSquare className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Comments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {signals.reduce((total, signal) => total + signal.comments.length, 0)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Signals Display */}
      {viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {signals.map((signal, index) => (
            <motion.div
              key={signal._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{signal.symbol}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{signal.description}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(signal.status)}`}>
                      {signal.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(signal.type)}`}>
                      {signal.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Entry</p>
                      <p className="font-semibold text-gray-900 dark:text-white">${signal.entryPrice}</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Target</p>
                      <p className="font-semibold text-gray-900 dark:text-white">${signal.targetPrice}</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Stop Loss</p>
                      <p className="font-semibold text-gray-900 dark:text-white">${signal.stopLoss}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Confidence: {signal.confidence}%</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(signal.riskLevel)}`}>
                      {signal.riskLevel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
                  <span>Timeframe: {signal.timeframe}</span>
                  <span>{new Date(signal.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>{signal.views}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>{signal.comments.length}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {signal.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleTogglePublish(signal._id, signal.isPublished)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          signal.isPublished 
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {signal.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleCloseSignal(signal._id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                      >
                        Close Signal
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => {
                      setSelectedSignal(signal);
                      setShowViewModal(true);
                    }}
                    className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                    title="View Signal"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setEditingSignal(signal);
                      setShowEditModal(true);
                    }}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                    title="Edit Signal"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteSignal(signal._id)}
                    className="px-3 py-2 text-red-600 hover:text-red-900 transition-colors"
                    title="Delete Signal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Signal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Prices
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {signals.map((signal, index) => (
                  <motion.tr
                    key={signal._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{signal.symbol}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-300 line-clamp-2 max-w-xs">{signal.description}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(signal.createdAt).toLocaleDateString()} • {signal.timeframe}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(signal.type)}`}>
                          {signal.type.toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(signal.riskLevel)}`}>
                          {signal.riskLevel}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Entry:</span>
                          <span className="font-medium text-gray-900 dark:text-white">${signal.entryPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Target:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">${signal.targetPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Stop:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">${signal.stopLoss}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(signal.status)}`}>
                          {signal.status}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Confidence: {signal.confidence}%
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm space-y-1">
                        <div className="flex items-center space-x-2">
                          <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span className="text-gray-900 dark:text-white">{signal.views}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span className="text-gray-900 dark:text-white">{signal.comments.length}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {signal.isPublished ? 'Published' : 'Draft'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {signal.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleTogglePublish(signal._id, signal.isPublished)}
                              className={`px-2 py-1 rounded text-xs transition-colors ${
                                signal.isPublished 
                                  ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {signal.isPublished ? 'Unpub' : 'Pub'}
                            </button>
                            <button
                              onClick={() => handleCloseSignal(signal._id)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                            >
                              Close
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => {
                            setSelectedSignal(signal);
                            setShowViewModal(true);
                          }}
                          className="px-2 py-1 text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Signal"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setEditingSignal(signal);
                            setShowEditModal(true);
                          }}
                          className="px-2 py-1 text-gray-600 hover:text-gray-900 transition-colors"
                          title="Edit Signal"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteSignal(signal._id)}
                          className="px-2 py-1 text-red-600 hover:text-red-900 transition-colors"
                          title="Delete Signal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Signal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create New Trading Signal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Symbol *</label>
                <input
                  type="text"
                  value={newSignal.symbol}
                  onChange={(e) => {
                    setNewSignal({ ...newSignal, symbol: e.target.value.toUpperCase() });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="e.g., EUR/USD, BTC/USD"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Instrument Type *</label>
                <select
                  value={newSignal.instrumentType}
                  onChange={(e) => setNewSignal({ ...newSignal, instrumentType: e.target.value as 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices' | 'futures' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="forex">Forex</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="stocks">Stocks</option>
                  <option value="commodities">Commodities</option>
                  <option value="indices">Indices</option>
                  <option value="futures">Futures</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Signal Type *</label>
                <select
                  value={newSignal.type}
                  onChange={(e) => setNewSignal({ ...newSignal, type: e.target.value as 'buy' | 'sell' | 'hold' | 'strong_buy' | 'strong_sell' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                  <option value="hold">Hold</option>
                  <option value="strong_buy">Strong Buy</option>
                  <option value="strong_sell">Strong Sell</option>
                </select>
              </div>
              
              {/* Current Market Prices Section */}
              <div className="col-span-full mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">📊 Current Market Prices (MT5 Style)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Current Bid *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newSignal.currentBid}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setNewSignal({ ...newSignal, currentBid: value });
                      }}
                      className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="0.0000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">Current Ask *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newSignal.currentAsk}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setNewSignal({ ...newSignal, currentAsk: value });
                      }}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">Daily High *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newSignal.dailyHigh}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setNewSignal({ ...newSignal, dailyHigh: value });
                      }}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">Daily Low *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newSignal.dailyLow}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setNewSignal({ ...newSignal, dailyLow: value });
                      }}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">Price Change *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newSignal.priceChange}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setNewSignal({ ...newSignal, priceChange: value });
                      }}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">Price Change % *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newSignal.priceChangePercent}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setNewSignal({ ...newSignal, priceChangePercent: value });
                      }}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entry Price *</label>
                                  <input
                    type="number"
                    step="0.0001"
                    value={newSignal.entryPrice}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setNewSignal({ ...newSignal, entryPrice: value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.0000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newSignal.type === 'buy' ? 'Entry price for buying the asset' : 'Entry price for selling the asset'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    💡 This is your entry point into the trade
                  </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Price *</label>
                                  <input
                    type="number"
                    step="0.0001"
                    value={newSignal.targetPrice}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setNewSignal({ ...newSignal, targetPrice: value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.0000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newSignal.type === 'buy' 
                      ? 'Target price (must be higher than entry for buy signals)' 
                      : 'Target price (must be lower than entry for sell signals)'}
                  </p>
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    🎯 {newSignal.type === 'buy' ? 'Set higher than entry for profit target' : 'Set lower than entry for profit target'}
                  </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stop Loss *</label>
                                  <input
                    type="number"
                    step="0.0001"
                    value={newSignal.stopLoss}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setNewSignal({ ...newSignal, stopLoss: value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.0000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newSignal.type === 'buy' 
                      ? 'Stop loss (must be lower than entry for buy signals)' 
                      : 'Stop loss (must be higher than entry for sell signals)'}
                  </p>
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    🛑 {newSignal.type === 'buy' ? 'Set lower than entry to limit losses' : 'Set higher than entry to limit losses'}
                  </p>
              </div>
              
              {/* Risk Management Section */}
              <div className="col-span-full mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">🛡️ Risk Management</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">Position Size</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newSignal.positionSize}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setNewSignal({ ...newSignal, positionSize: value });
                      }}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-green-600 mt-1">Size of the position in lots/units</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">Max Risk</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newSignal.maxRisk}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setNewSignal({ ...newSignal, maxRisk: value });
                      }}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-green-600 mt-1">Maximum risk amount in currency</p>
                  </div>
                </div>
              </div>
              
              {/* Debug Info - Remove this later */}
              <div className="col-span-full mt-4 p-3 bg-gray-100 rounded border">
                <p className="text-sm font-mono">
                  Debug: Entry={newSignal.entryPrice}, Target={newSignal.targetPrice}, StopLoss={newSignal.stopLoss}, Type={newSignal.type}
                </p>
              </div>
              
              {/* Price Validation Indicator */}
              <div className="col-span-full mt-4 border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3">💰 Price Validation</h4>
                {newSignal.entryPrice > 0 && newSignal.targetPrice > 0 && newSignal.stopLoss > 0 ? (
                  <div className={`p-4 rounded-lg border-2 ${
                    (newSignal.type === 'buy' && newSignal.targetPrice > newSignal.entryPrice && newSignal.stopLoss < newSignal.entryPrice) ||
                    (newSignal.type === 'sell' && newSignal.targetPrice < newSignal.entryPrice && newSignal.stopLoss > newSignal.entryPrice)
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : 'bg-red-50 border-red-300 text-red-800'
                  }`}>
                    <div className="flex items-center mb-2">
                      {(newSignal.type === 'buy' && newSignal.targetPrice > newSignal.entryPrice && newSignal.stopLoss < newSignal.entryPrice) ||
                       (newSignal.type === 'sell' && newSignal.targetPrice < newSignal.entryPrice && newSignal.stopLoss > newSignal.entryPrice) ? (
                        <>
                          <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-lg font-semibold">✅ Price Validation PASSED!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-6 h-6 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span className="text-lg font-semibold">❌ Price Validation FAILED!</span>
                        </>
                      )}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium mb-1">Current Price Logic:</p>
                      <p className="mb-1">
                        {newSignal.type === 'buy' 
                          ? `For BUY signals: Stop Loss (${newSignal.stopLoss}) < Entry (${newSignal.entryPrice}) < Target (${newSignal.targetPrice})`
                          : `For SELL signals: Target (${newSignal.targetPrice}) < Entry (${newSignal.entryPrice}) < Stop Loss (${newSignal.stopLoss})`
                        }
                      </p>
                      {newSignal.type === 'buy' ? (
                        <div className="mt-2 space-y-1">
                          {newSignal.targetPrice <= newSignal.entryPrice && (
                            <p className="text-red-600">⚠️ Target price must be HIGHER than entry price for BUY signals</p>
                          )}
                          {newSignal.stopLoss >= newSignal.entryPrice && (
                            <p className="text-red-600">⚠️ Stop loss must be LOWER than entry price for BUY signals</p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {newSignal.targetPrice >= newSignal.entryPrice && (
                            <p className="text-red-600">⚠️ Target price must be LOWER than entry price for SELL signals</p>
                          )}
                          {newSignal.stopLoss <= newSignal.entryPrice && (
                            <p className="text-red-600">⚠️ Stop loss must be HIGHER than entry price for SELL signals</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg text-blue-800">
                    <div className="flex items-center mb-2">
                      <svg className="w-6 h-6 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-lg font-semibold">ℹ️ Price Validation Guide</span>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium mb-1">Fill in all three price fields to see validation:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>BUY signals:</strong> Stop Loss &lt; Entry &lt; Target</li>
                        <li><strong>SELL signals:</strong> Target &lt; Entry &lt; Stop Loss</li>
                      </ul>
                    </div>
                    <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-200">
                      {newSignal.entryPrice > 0 ? (
                        <>
                          <p className="text-xs text-blue-700">
                            <strong>Example for BUY:</strong> Entry: {newSignal.entryPrice}, Target: {(newSignal.entryPrice * 1.01).toFixed(4)}, Stop Loss: {(newSignal.entryPrice * 0.995).toFixed(4)}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            <strong>Example for SELL:</strong> Entry: {newSignal.entryPrice}, Target: {(newSignal.entryPrice * 0.99).toFixed(4)}, Stop Loss: {(newSignal.entryPrice * 1.005).toFixed(4)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-blue-700">
                            <strong>Example for BUY:</strong> Entry: 1.0850, Target: 1.0920, Stop Loss: 1.0800
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            <strong>Example for SELL:</strong> Entry: 1.0850, Target: 1.0800, Stop Loss: 1.0920
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe *</label>
                <select
                  value={newSignal.timeframe}
                  onChange={(e) => setNewSignal({ ...newSignal, timeframe: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="30m">30 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">1 Day</option>
                  <option value="1w">1 Week</option>
                  <option value="1M">1 Month</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confidence Level *</label>
                                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newSignal.confidence}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setNewSignal({ ...newSignal, confidence: value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="50"
                  />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                <select
                  value={newSignal.riskLevel}
                  onChange={(e) => setNewSignal({ ...newSignal, riskLevel: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Market Conditions</label>
                <select
                  value={newSignal.marketConditions}
                  onChange={(e) => setNewSignal({ ...newSignal, marketConditions: e.target.value as 'bullish' | 'bearish' | 'sideways' | 'volatile' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="bullish">Bullish</option>
                  <option value="bearish">Bearish</option>
                  <option value="sideways">Sideways</option>
                  <option value="volatile">Volatile</option>
                </select>
              </div>


            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                              <textarea
                  value={newSignal.description}
                  onChange={(e) => {
                    setNewSignal({ ...newSignal, description: e.target.value });
                  }}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Provide detailed analysis and reasoning for this trading signal..."
                />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                value={newSignal.tags.join(', ')}
                onChange={(e) => setNewSignal({ ...newSignal, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="forex, technical analysis, support resistance"
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSignal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Signal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Signal Modal */}
      {showEditModal && editingSignal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Trading Signal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
                <input
                  type="text"
                  value={editingSignal.symbol}
                  onChange={(e) => setEditingSignal({ ...editingSignal, symbol: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Signal Type</label>
                <select
                  value={editingSignal.type}
                  onChange={(e) => setEditingSignal({ ...editingSignal, type: e.target.value as 'buy' | 'sell' | 'hold' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                  <option value="hold">Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entry Price</label>
                <input
                  type="number"
                  step="0.0001"
                  value={editingSignal.entryPrice}
                  onChange={(e) => setEditingSignal({ ...editingSignal, entryPrice: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Price</label>
                <input
                  type="number"
                  step="0.0001"
                  value={editingSignal.targetPrice}
                  onChange={(e) => setEditingSignal({ ...editingSignal, targetPrice: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stop Loss</label>
                <input
                  type="number"
                  step="0.0001"
                  value={editingSignal.stopLoss}
                  onChange={(e) => setEditingSignal({ ...editingSignal, stopLoss: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confidence Level</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editingSignal.confidence}
                  onChange={(e) => setEditingSignal({ ...editingSignal, confidence: parseInt(e.target.value) })}
                  className="w-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={editingSignal.description}
                onChange={(e) => setEditingSignal({ ...editingSignal, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSignal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update Signal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Signal Modal */}
      {showViewModal && selectedSignal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Trading Signal Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-4">{selectedSignal.symbol}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedSignal.type)}`}>
                      {selectedSignal.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedSignal.status)}`}>
                      {selectedSignal.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Risk Level:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(selectedSignal.riskLevel)}`}>
                      {selectedSignal.riskLevel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Timeframe:</span>
                    <span className="font-medium">{selectedSignal.timeframe}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Confidence:</span>
                    <span className="font-medium">{selectedSignal.confidence}%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-semibold text-gray-900 mb-3">Price Information</h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Entry Price:</span>
                    <span className="font-bold text-lg">${selectedSignal.entryPrice}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Target Price:</span>
                    <span className="font-bold text-lg text-green-600">${selectedSignal.targetPrice}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Stop Loss:</span>
                    <span className="font-bold text-lg text-red-600">${selectedSignal.stopLoss}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h5 className="font-semibold text-gray-900 mb-3">Analysis & Description</h5>
              <p className="text-gray-700 leading-relaxed">{selectedSignal.description}</p>
            </div>
            
            <div className="mt-6">
              <h5 className="font-semibold text-gray-900 mb-3">Performance Metrics</h5>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <p className="text-blue-600 text-xs font-medium">Views</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedSignal.views}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <p className="text-green-600 text-xs font-medium">Likes</p>
                  <p className="text-2xl font-bold text-green-900">{selectedSignal.likes.length}</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                  <p className="text-purple-600 text-xs font-medium">Comments</p>
                  <p className="text-2xl font-bold text-purple-900">{selectedSignal.comments.length}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h5 className="font-semibold text-gray-900 mb-3">Comments</h5>
              {selectedSignal.comments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No comments yet</p>
              ) : (
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {selectedSignal.comments.map((comment, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-700">{comment.text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
