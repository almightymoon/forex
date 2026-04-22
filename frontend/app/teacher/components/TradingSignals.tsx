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
import { buildApiUrl } from "../../../utils/api";
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
  targets?: number[];
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
  targets: number[];
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [clientValidationEnabled, setClientValidationEnabled] = useState(true);
  const [newSignal, setNewSignal] = useState<CreateSignalData>({
    symbol: 'SIGNAL',
    instrumentType: 'forex',
    type: 'buy',
    currentBid: 0,
    currentAsk: 0,
    dailyHigh: 0,
    dailyLow: 0,
    priceChange: 0,
    priceChangePercent: 0,
    entryPrice: 0,
    targets: [0],
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('teacherSignals.clientValidationEnabled');
      if (raw === '0') setClientValidationEnabled(false);
      if (raw === '1') setClientValidationEnabled(true);
    } catch {
      // ignore
    }
  }, []);

  const persistClientValidationEnabled = (next: boolean) => {
    setClientValidationEnabled(next);
    try {
      localStorage.setItem('teacherSignals.clientValidationEnabled', next ? '1' : '0');
    } catch {
      // ignore
    }
  };

  const validateCreateSignalClientSide = () => {
    const errors: Record<string, string> = {};

    const entry = Number(newSignal.entryPrice);
    const stop = Number(newSignal.stopLoss);
    const targets = Array.isArray(newSignal.targets)
      ? newSignal.targets.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
      : [];

    if (!Number.isFinite(entry) || entry <= 0) errors.entryPrice = 'Entry price must be a positive number.';
    if (!Number.isFinite(stop) || stop <= 0) errors.stopLoss = 'Stop loss must be a positive number.';
    if (targets.length === 0) errors.targets = 'At least one target price is required.';

    const sigType = newSignal.type;
    const firstTarget = targets[0];
    const isBuy = sigType === 'buy' || sigType === 'strong_buy';
    const isSell = sigType === 'sell' || sigType === 'strong_sell';

    if (targets.length > 0 && Number.isFinite(entry) && entry > 0) {
      // enforce direction for all targets (helps avoid partial mistakes)
      const badTarget = targets.find((t) => (isBuy ? t <= entry : isSell ? t >= entry : false));
      if (badTarget != null) {
        errors.targets = isBuy
          ? 'For BUY signals: all target prices must be higher than entry price.'
          : isSell
            ? 'For SELL signals: all target prices must be lower than entry price.'
            : errors.targets;
      }
    }

    if (Number.isFinite(entry) && entry > 0 && Number.isFinite(stop) && stop > 0) {
      if (isBuy && stop >= entry) errors.stopLoss = 'For BUY signals: stop loss must be lower than entry price.';
      if (isSell && stop <= entry) errors.stopLoss = 'For SELL signals: stop loss must be higher than entry price.';
    }

    return { errors, targets };
  };

  // Function to suggest values based on current bid
  const suggestValuesFromBid = (bid: number, signalType?: 'buy' | 'sell' | 'hold' | 'strong_buy' | 'strong_sell', instrumentType?: string) => {
    if (!bid || bid <= 0) return null;

    const type = signalType || newSignal.type;
    const instType = instrumentType || newSignal.instrumentType;

    // Calculate spread (typical forex spread is 0.0001-0.0005, crypto can be larger)
    const isForex = instType === 'forex';
    const spread = isForex ? 0.0002 : bid * 0.001; // 0.02% for non-forex
    
    // Suggest Ask (slightly higher than bid)
    const suggestedAsk = bid + spread;
    
    // Suggest Daily High (1-2% above bid for volatility)
    const suggestedDailyHigh = bid * 1.015;
    
    // Suggest Daily Low (1-2% below bid for volatility)
    const suggestedDailyLow = bid * 0.985;
    
    // Suggest Entry Price (use ask for buy, bid for sell)
    const suggestedEntryPrice = (type === 'buy' || type === 'strong_buy') ? suggestedAsk : bid;
    
    // Suggest Target and Stop Loss based on signal type
    let suggestedTargetPrice = 0;
    let suggestedStopLoss = 0;
    
    if (type === 'buy' || type === 'strong_buy') {
      // For buy: target above entry, stop loss below entry
      suggestedTargetPrice = suggestedEntryPrice * 1.01; // 1% profit target
      suggestedStopLoss = suggestedEntryPrice * 0.995; // 0.5% stop loss
    } else if (type === 'sell' || type === 'strong_sell') {
      // For sell: target below entry, stop loss above entry
      suggestedTargetPrice = suggestedEntryPrice * 0.99; // 1% profit target
      suggestedStopLoss = suggestedEntryPrice * 1.005; // 0.5% stop loss
    }
    
    return {
      currentAsk: parseFloat(suggestedAsk.toFixed(4)),
      dailyHigh: parseFloat(suggestedDailyHigh.toFixed(4)),
      dailyLow: parseFloat(suggestedDailyLow.toFixed(4)),
      entryPrice: parseFloat(suggestedEntryPrice.toFixed(4)),
      targetPrice: parseFloat(suggestedTargetPrice.toFixed(4)),
      stopLoss: parseFloat(suggestedStopLoss.toFixed(4)),
      priceChange: parseFloat((suggestedAsk - bid).toFixed(4)),
      priceChangePercent: parseFloat(((suggestedAsk - bid) / bid * 100).toFixed(2))
    };
  };

  const fetchSignals = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(buildApiUrl('api/signals'), {
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
    // Clear previous errors
    setFieldErrors({});
    
    try {
      if (clientValidationEnabled) {
        const { errors } = validateCreateSignalClientSide();
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          const first = Object.values(errors)[0] || 'Please correct the validation errors below.';
          showToast(first, 'error');
          return;
        }
      }

      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(buildApiUrl('api/signals'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSignal)
      });

      if (response.ok) {
        showToast('Trading signal created successfully', 'success');
        setFieldErrors({});
        setShowCreateModal(false);
        setNewSignal({
          symbol: 'SIGNAL',
          instrumentType: 'forex',
          type: 'buy',
          currentBid: 0,
          currentAsk: 0,
          dailyHigh: 0,
          dailyLow: 0,
          priceChange: 0,
          priceChangePercent: 0,
          entryPrice: 0,
          targets: [0],
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
        let errorMessage = 'Failed to create signal';
        const contentType = response.headers.get('content-type');
        
        try {
          let errorData;
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            const text = await response.text();
            errorData = text ? { message: text } : { message: `Server error: ${response.status} ${response.statusText}` };
          }
          
          // Handle different error response formats
          // Check for errors array first (most detailed)
          const errorsMap: Record<string, string> = {};
          
          if (errorData.errors && Array.isArray(errorData.errors)) {
            // Store field-specific errors for inline display
            errorData.errors.forEach((err: any) => {
              const field = err?.field || err?.path || err?.param;
              const message = err?.message || err?.msg;
              if (field && message) {
                // Store error by field name (use camelCase as key)
                errorsMap[String(field)] = String(message);
              }
            });
            
            // Set field errors for inline display
            if (Object.keys(errorsMap).length > 0) {
              setFieldErrors(errorsMap);
              const summary = Object.values(errorsMap).slice(0, 2).join(' | ');
              showToast(summary || 'Please correct the validation errors below', 'error');
            } else {
              // Fallback if no field-specific errors
              const errorText = errorData.errors.map((err: any) => err.message || String(err)).join(' | ');
              showToast(errorText || 'Validation failed', 'error');
            }
          } else if (errorData.errors && typeof errorData.errors === 'object') {
            // Handle object with field-specific errors
            Object.entries(errorData.errors).forEach(([field, message]) => {
              errorsMap[field] = String(message);
            });
            
            if (Object.keys(errorsMap).length > 0) {
              setFieldErrors(errorsMap);
              showToast('Please correct the validation errors below', 'error');
            } else {
              showToast('Validation errors occurred', 'error');
            }
          } else if (errorData.message && errorData.message !== 'Please correct the following errors') {
            // Use message if it's not the generic one
            showToast(errorData.message, 'error');
          } else if (errorData.error) {
            showToast(errorData.error, 'error');
          } else {
            showToast('Failed to create signal', 'error');
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          showToast(`Server error: ${response.status} ${response.statusText}`, 'error');
        }
      }
    } catch (error) {
      console.error('Network error creating signal:', error);
      const errorMsg = error instanceof Error ? error.message : 'Network error occurred';
      showToast(`Error creating signal: ${errorMsg}`, 'error');
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

      const response = await fetch(buildApiUrl(`api/signals/${editingSignal._id}`), {
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

      const response = await fetch(buildApiUrl(`api/signals/${signalId}`), {
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

      const response = await fetch(buildApiUrl(`api/signals/${signalId}`), {
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

      const response = await fetch(buildApiUrl('api/signals/${signalId}/close'), {
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
              className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
            >
              <div className="p-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-2xl font-semibold tracking-wide text-gray-900 dark:text-white truncate">
                      {(signal.symbol || '').replace('/', ' ').trim()}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                      {signal.description || '—'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          signal.status === 'active'
                            ? 'bg-emerald-500'
                            : signal.status === 'closed'
                              ? 'bg-gray-400'
                              : 'bg-amber-500'
                        }`}
                      />
                      {signal.status}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                        signal.type === 'buy' || signal.type === 'strong_buy'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800/50'
                          : signal.type === 'sell' || signal.type === 'strong_sell'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800/50'
                            : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800/50'
                      }`}
                    >
                      {signal.type.toUpperCase()}
                      <span className="text-current/70">↗</span>
                    </span>
                  </div>
                </div>

                {/* Price tiles */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Entry</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">${Number(signal.entryPrice || 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Target</p>
                      {Array.isArray((signal as any).targets) && (signal as any).targets.length > 1 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                          +{(signal as any).targets.length - 1}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                      ${Number(signal.targetPrice || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Stop Loss</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">${Number(signal.stopLoss || 0).toFixed(2)}</p>
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <span>Confidence: {signal.confidence}%</span>
                    <div className="h-1.5 w-28 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.min(100, Math.max(0, Number(signal.confidence || 0)))}%` }}
                      />
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
                    {signal.riskLevel}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    Timeframe: {signal.timeframe}
                    <span className="opacity-60">•</span>
                    {new Date(signal.createdAt).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center gap-4">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {signal.views}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {signal.comments.length}
                    </span>
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-5 flex items-center gap-2 flex-wrap">
                  {signal.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleTogglePublish(signal._id, signal.isPublished)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          signal.isPublished
                            ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800/50 dark:hover:bg-amber-900/30'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800/50 dark:hover:bg-emerald-900/30'
                        }`}
                      >
                        {signal.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleCloseSignal(signal._id)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                      >
                        Close Signal
                      </button>
                    </>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedSignal(signal);
                        setShowViewModal(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 dark:text-gray-200"
                      title="View Signal"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingSignal(signal);
                        setShowEditModal(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 dark:text-gray-200"
                      title="Edit Signal"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSignal(signal._id)}
                      className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-rose-50 border border-gray-200 text-rose-700 dark:bg-gray-800 dark:hover:bg-rose-900/20 dark:border-gray-700 dark:text-rose-200"
                      title="Delete Signal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Trading Signal</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFieldErrors({});
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div className="font-medium text-gray-900 dark:text-white">Validation</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Turn off to bypass frontend checks (backend validation still applies).
                </div>
              </div>
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={clientValidationEnabled}
                  onChange={(e) => persistClientValidationEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {clientValidationEnabled ? 'On' : 'Off'}
                </span>
              </label>
            </div>

            {Object.keys(fieldErrors).length > 0 && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                <div className="text-sm font-semibold text-red-800 dark:text-red-200">
                  Please correct the validation errors below
                </div>
                <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-200">
                  {Object.entries(fieldErrors).map(([field, message]) => (
                    <li key={field}>
                      <span className="font-semibold">{field}</span>: {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Entry Price *</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newSignal.entryPrice}
                  onChange={(e) => setNewSignal({ ...newSignal, entryPrice: parseFloat(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    fieldErrors.entryPrice ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0.0000"
                />
                {fieldErrors.entryPrice ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.entryPrice}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stop Loss *</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newSignal.stopLoss}
                  onChange={(e) => setNewSignal({ ...newSignal, stopLoss: parseFloat(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    fieldErrors.stopLoss ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0.0000"
                />
                {fieldErrors.stopLoss ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.stopLoss}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Prices *</label>
                <div className="space-y-2">
                  {(newSignal.targets || []).map((t, idx) => (
                    <div key={`target-${idx}`} className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={t}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setNewSignal((prev) => {
                            const nextTargets = [...(prev.targets || [])];
                            nextTargets[idx] = value;
                            return { ...prev, targets: nextTargets };
                          });
                        }}
                        className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          fieldErrors.targets ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="0.0000"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewSignal((prev) => {
                            const nextTargets = [...(prev.targets || [])];
                            nextTargets.splice(idx, 1);
                            return { ...prev, targets: nextTargets.length ? nextTargets : [0] };
                          });
                        }}
                        className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                        disabled={(newSignal.targets || []).length <= 1}
                        title="Remove target"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNewSignal((prev) => ({ ...prev, targets: [...(prev.targets || []), 0] }))}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add target
                </button>
                {fieldErrors.targets ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.targets}</p>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setFieldErrors({});
                  setShowCreateModal(false);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSignal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
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
