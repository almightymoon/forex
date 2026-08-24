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

function formatSignalPrice(value: number | string | undefined | null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 100) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  if (Math.abs(n) >= 1) {
    return n.toFixed(2);
  }
  return n.toFixed(4);
}

const QUICK_PAIRS = [
  { symbol: 'XAUUSD', instrumentType: 'commodities' as const },
  { symbol: 'EURUSD', instrumentType: 'forex' as const },
  { symbol: 'GBPUSD', instrumentType: 'forex' as const },
  { symbol: 'USDJPY', instrumentType: 'forex' as const },
  { symbol: 'BTCUSD', instrumentType: 'crypto' as const },
  { symbol: 'NAS100', instrumentType: 'indices' as const },
];

const QUICK_TIMEFRAMES: Array<{ value: CreateSignalData['timeframe']; label: string }> = [
  { value: '15m', label: 'M15' },
  { value: '1h', label: 'H1' },
  { value: '4h', label: 'H4' },
  { value: '1d', label: 'D1' },
];

function emptyCreateSignal(): CreateSignalData {
  return {
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
    targets: [0],
    stopLoss: 0,
    positionSize: 0,
    maxRisk: 0,
    description: '',
    timeframe: '1h',
    confidence: 70,
    riskLevel: 'medium',
    marketConditions: 'sideways',
    technicalIndicators: [],
    tags: [],
  };
}

function parsePriceInput(raw: string): number {
  if (raw.trim() === '') return 0;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function instrumentForSymbol(symbol: string): CreateSignalData['instrumentType'] {
  const s = symbol.toUpperCase();
  if (s.includes('BTC') || s.includes('ETH') || s.includes('USDT')) return 'crypto';
  if (s.includes('XAU') || s.includes('XAG') || s.includes('OIL')) return 'commodities';
  if (s.includes('NAS') || s.includes('US30') || s.includes('SPX') || s.includes('DAX')) return 'indices';
  return 'forex';
}

function computeRiskReward(
  type: string,
  entry: number,
  stop: number,
  target: number
): string | null {
  if (!(entry > 0 && stop > 0 && target > 0)) return null;
  const isBuy = type === 'buy' || type === 'strong_buy';
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (risk <= 0) return null;
  const rr = reward / risk;
  if (!Number.isFinite(rr)) return null;
  return `1 : ${rr.toFixed(2)}`;
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
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [newSignal, setNewSignal] = useState<CreateSignalData>(emptyCreateSignal);

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

    const symbol = String(newSignal.symbol || '').trim();
    if (!symbol) errors.symbol = 'Pick a pair / symbol.';

    const entry = Number(newSignal.entryPrice);
    const stop = Number(newSignal.stopLoss);
    const targets = Array.isArray(newSignal.targets)
      ? newSignal.targets.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
      : [];

    if (!Number.isFinite(entry) || entry <= 0) errors.entryPrice = 'Entry price must be a positive number.';
    if (!Number.isFinite(stop) || stop <= 0) errors.stopLoss = 'Stop loss must be a positive number.';
    if (targets.length === 0) errors.targets = 'At least one target price is required.';

    const sigType = newSignal.type;
    const isBuy = sigType === 'buy' || sigType === 'strong_buy';
    const isSell = sigType === 'sell' || sigType === 'strong_sell';

    if (targets.length > 0 && Number.isFinite(entry) && entry > 0) {
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

      const entry = Number(newSignal.entryPrice);
      const payload: CreateSignalData = {
        ...newSignal,
        symbol: String(newSignal.symbol || '').trim().toUpperCase() || 'SIGNAL',
        description: String(newSignal.description || '').trim(),
        targets: Array.isArray(newSignal.targets)
          ? newSignal.targets.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
          : [],
      };

      // Market snapshot fields are optional in the UI — derive them from entry when unset
      const hasMarketSnapshot =
        Number(payload.currentBid) > 0 &&
        Number(payload.currentAsk) > 0 &&
        Number(payload.dailyHigh) > 0 &&
        Number(payload.dailyLow) > 0;
      if (!hasMarketSnapshot && Number.isFinite(entry) && entry > 0) {
        const spread = Math.max(entry * 0.0002, 0.0001);
        payload.currentBid = entry;
        payload.currentAsk = parseFloat((entry + spread).toFixed(4));
        payload.dailyHigh = parseFloat(Math.max(payload.currentAsk, entry * 1.01).toFixed(4));
        payload.dailyLow = parseFloat(Math.min(payload.currentBid, entry * 0.99).toFixed(4));
        payload.priceChange = parseFloat((payload.currentAsk - payload.currentBid).toFixed(4));
        payload.priceChangePercent = parseFloat(
          (((payload.currentAsk - payload.currentBid) / payload.currentBid) * 100).toFixed(2)
        );
      }

      const response = await fetch(buildApiUrl('api/signals'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast('Trading signal created successfully', 'success');
        setFieldErrors({});
        setShowCreateModal(false);
        setShowMoreOptions(false);
        setNewSignal(emptyCreateSignal());
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

      const response = await fetch(buildApiUrl(`api/signals/${signalId}/close`), {
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
      case 'buy':
      case 'strong_buy': return 'bg-green-100 text-green-800';
      case 'sell':
      case 'strong_sell': return 'bg-red-100 text-red-800';
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
            onClick={() => {
              setFieldErrors({});
              setShowMoreOptions(false);
              setNewSignal(emptyCreateSignal());
              setShowCreateModal(true);
            }}
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
                <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-3 dark:border-gray-700 dark:bg-gray-800 sm:px-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Entry</p>
                    <p className="mt-1 truncate text-base font-bold tabular-nums text-gray-900 dark:text-white sm:text-lg">
                      ${formatSignalPrice(signal.entryPrice)}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-3 dark:border-gray-700 dark:bg-gray-800 sm:px-3">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Target</p>
                      {Array.isArray((signal as any).targets) && (signal as any).targets.length > 1 ? (
                        <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          +{(signal as any).targets.length - 1}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-base font-bold tabular-nums text-gray-900 dark:text-white sm:text-lg">
                      ${formatSignalPrice(signal.targetPrice)}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-3 dark:border-gray-700 dark:bg-gray-800 sm:px-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Stop</p>
                    <p className="mt-1 truncate text-base font-bold tabular-nums text-gray-900 dark:text-white sm:text-lg">
                      ${formatSignalPrice(signal.stopLoss)}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <span className="shrink-0">Confidence {signal.confidence}%</span>
                    <div className="h-1.5 min-w-[4rem] flex-1 max-w-[7rem] overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.min(100, Math.max(0, Number(signal.confidence || 0)))}%` }}
                      />
                    </div>
                  </div>
                  <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {signal.riskLevel}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    {signal.timeframe}
                    <span className="opacity-60">•</span>
                    {new Date(signal.createdAt).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {signal.views}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {signal.comments.length}
                    </span>
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                  {signal.status === 'active' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleTogglePublish(signal._id, signal.isPublished)}
                        className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                          signal.isPublished
                            ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/30'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:bg-emerald-900/30'
                        }`}
                      >
                        {signal.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleCloseSignal(signal._id)}
                        className="rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                      >
                        Close Signal
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setSelectedSignal(signal);
                        setShowViewModal(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      title="View Signal"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => {
                        setEditingSignal(signal);
                        setShowEditModal(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      title="Edit Signal"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSignal(signal._id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-900/20 dark:text-rose-200 dark:hover:bg-rose-900/30"
                      title="Delete Signal"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New signal</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Buy/Sell · pair · levels · remarks — publish in seconds</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFieldErrors({});
                  setShowMoreOptions(false);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none px-1"
              >
                ✕
              </button>
            </div>

            {Object.keys(fieldErrors).length > 0 && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                <div className="text-sm font-semibold text-red-800 dark:text-red-200">Fix these to publish</div>
                <ul className="mt-1 space-y-0.5 text-sm text-red-700 dark:text-red-200">
                  {Object.entries(fieldErrors).map(([field, message]) => (
                    <li key={field}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Direction *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSignal((prev) => ({ ...prev, type: 'buy' }))}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                      newSignal.type === 'buy' || newSignal.type === 'strong_buy'
                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                        : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSignal((prev) => ({ ...prev, type: 'sell' }))}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                      newSignal.type === 'sell' || newSignal.type === 'strong_sell'
                        ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400'
                        : 'bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    SELL
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pair / Symbol *</label>
                <input
                  type="text"
                  value={newSignal.symbol}
                  onChange={(e) => {
                    const symbol = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setNewSignal((prev) => ({
                      ...prev,
                      symbol,
                      instrumentType: instrumentForSymbol(symbol),
                    }));
                  }}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold tracking-wide ${
                    fieldErrors.symbol ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="e.g. XAUUSD"
                  autoComplete="off"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_PAIRS.map((p) => (
                    <button
                      key={p.symbol}
                      type="button"
                      onClick={() =>
                        setNewSignal((prev) => ({
                          ...prev,
                          symbol: p.symbol,
                          instrumentType: p.instrumentType,
                        }))
                      }
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        newSignal.symbol === p.symbol
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {p.symbol}
                    </button>
                  ))}
                </div>
                {fieldErrors.symbol ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.symbol}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timeframe</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.value}
                      type="button"
                      onClick={() => setNewSignal((prev) => ({ ...prev, timeframe: tf.value }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        newSignal.timeframe === tf.value
                          ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Entry *</label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={newSignal.entryPrice || ''}
                    onChange={(e) => setNewSignal({ ...newSignal, entryPrice: parsePriceInput(e.target.value) })}
                    className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      fieldErrors.entryPrice ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="0.00"
                  />
                  {fieldErrors.entryPrice ? (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.entryPrice}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Stop Loss *</label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={newSignal.stopLoss || ''}
                    onChange={(e) => setNewSignal({ ...newSignal, stopLoss: parsePriceInput(e.target.value) })}
                    className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      fieldErrors.stopLoss ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="0.00"
                  />
                  {fieldErrors.stopLoss ? (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.stopLoss}</p>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Take Profit *</label>
                  {(() => {
                    const firstTp = (newSignal.targets || []).map(Number).find((n) => n > 0) || 0;
                    const rr = computeRiskReward(newSignal.type, Number(newSignal.entryPrice), Number(newSignal.stopLoss), firstTp);
                    return rr ? (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">R:R {rr}</span>
                    ) : null;
                  })()}
                </div>
                <div className="space-y-2">
                  {(newSignal.targets || []).map((t, idx) => (
                    <div key={`target-${idx}`} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-8">TP{idx + 1}</span>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={t || ''}
                        onChange={(e) => {
                          const value = parsePriceInput(e.target.value);
                          setNewSignal((prev) => {
                            const nextTargets = [...(prev.targets || [])];
                            nextTargets[idx] = value;
                            return { ...prev, targets: nextTargets };
                          });
                        }}
                        className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          fieldErrors.targets ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="0.00"
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
                        className="px-2.5 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
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
                  className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add TP
                </button>
                {fieldErrors.targets ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.targets}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Remarks <span className="font-normal text-gray-400">(shown to students)</span>
                </label>
                <textarea
                  value={newSignal.description}
                  onChange={(e) => setNewSignal({ ...newSignal, description: e.target.value.slice(0, 1000) })}
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
                  placeholder="e.g. Wait for H1 close above resistance. Move SL to BE after TP1."
                />
                <div className="mt-1 text-right text-[11px] text-gray-400">{newSignal.description.length}/1000</div>
              </div>

              <button
                type="button"
                onClick={() => setShowMoreOptions((v) => !v)}
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {showMoreOptions ? 'Hide more options' : 'More options (risk, confidence…)'}
              </button>

              {showMoreOptions && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Risk</label>
                    <select
                      value={newSignal.riskLevel}
                      onChange={(e) =>
                        setNewSignal({ ...newSignal, riskLevel: e.target.value as CreateSignalData['riskLevel'] })
                      }
                      className="w-full px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Confidence %</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newSignal.confidence}
                      onChange={(e) =>
                        setNewSignal({ ...newSignal, confidence: Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 50)) })
                      }
                      className="w-full px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Market bias</label>
                    <select
                      value={newSignal.marketConditions}
                      onChange={(e) =>
                        setNewSignal({
                          ...newSignal,
                          marketConditions: e.target.value as CreateSignalData['marketConditions'],
                        })
                      }
                      className="w-full px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="bullish">Bullish</option>
                      <option value="bearish">Bearish</option>
                      <option value="sideways">Sideways</option>
                      <option value="volatile">Volatile</option>
                    </select>
                  </div>
                  <label className="col-span-2 inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={clientValidationEnabled}
                      onChange={(e) => persistClientValidationEnabled(e.target.checked)}
                      className="h-3.5 w-3.5 rounded"
                    />
                    Client-side price checks (backend still validates)
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setFieldErrors({});
                  setShowMoreOptions(false);
                  setShowCreateModal(false);
                }}
                className="px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSignal}
                className={`px-5 py-2.5 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  newSignal.type === 'sell' || newSignal.type === 'strong_sell'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Zap className="w-4 h-4" />
                Publish {(newSignal.type === 'sell' || newSignal.type === 'strong_sell') ? 'SELL' : 'BUY'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Signal Modal */}
      {showEditModal && editingSignal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit signal</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSignal({ ...editingSignal, type: 'buy' })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold ${
                      editingSignal.type === 'buy' || editingSignal.type === 'strong_buy'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" /> BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSignal({ ...editingSignal, type: 'sell' })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold ${
                      editingSignal.type === 'sell' || editingSignal.type === 'strong_sell'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" /> SELL
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pair / Symbol</label>
                <input
                  type="text"
                  value={editingSignal.symbol}
                  onChange={(e) =>
                    setEditingSignal({
                      ...editingSignal,
                      symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                    })
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Entry</label>
                  <input
                    type="number"
                    step="any"
                    value={editingSignal.entryPrice || ''}
                    onChange={(e) =>
                      setEditingSignal({ ...editingSignal, entryPrice: parsePriceInput(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Stop Loss</label>
                  <input
                    type="number"
                    step="any"
                    value={editingSignal.stopLoss || ''}
                    onChange={(e) =>
                      setEditingSignal({ ...editingSignal, stopLoss: parsePriceInput(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Take Profit</label>
                <input
                  type="number"
                  step="any"
                  value={editingSignal.targetPrice || ''}
                  onChange={(e) => {
                    const tp = parsePriceInput(e.target.value);
                    setEditingSignal({
                      ...editingSignal,
                      targetPrice: tp,
                      targets: [tp, ...(editingSignal.targets || []).slice(1)],
                    });
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Remarks <span className="font-normal text-gray-400">(shown to students)</span>
                </label>
                <textarea
                  value={editingSignal.description || ''}
                  onChange={(e) =>
                    setEditingSignal({ ...editingSignal, description: e.target.value.slice(0, 1000) })
                  }
                  rows={4}
                  maxLength={1000}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Trade plan, invalidation, management notes…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confidence %</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editingSignal.confidence}
                    onChange={(e) =>
                      setEditingSignal({
                        ...editingSignal,
                        confidence: Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 50)),
                      })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Timeframe</label>
                  <select
                    value={editingSignal.timeframe}
                    onChange={(e) => setEditingSignal({ ...editingSignal, timeframe: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {QUICK_TIMEFRAMES.map((tf) => (
                      <option key={tf.value} value={tf.value}>{tf.label}</option>
                    ))}
                    <option value="5m">M5</option>
                    <option value="30m">M30</option>
                    <option value="1w">W1</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSignal}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                Save changes
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
              <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Remarks</h5>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {selectedSignal.description || 'No remarks added.'}
              </p>
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
