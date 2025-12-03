'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Settings, 
  RefreshCw,
  Link as LinkIcon,
  Unlink,
  CheckCircle,
  XCircle,
  BarChart3,
  DollarSign,
  Percent,
  Activity,
  Clock,
  Target,
  AlertCircle,
  Copy,
  Play,
  Pause,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { buildApiUrl } from '../../utils/api';
import { showToast } from '../../utils/toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MT5Account {
  _id: string;
  mt5Login: number;
  mt5Server: string;
  isActive: boolean;
  isVerified: boolean;
  accountInfo: {
    balance: number;
    equity: number;
    margin: number;
    freeMargin: number;
    marginLevel: number;
    currency: string;
    leverage: number;
  };
  copyTradingEnabled: boolean;
  copyTradingSettings: {
    maxRiskPercent: number;
    multiplier: number;
    symbols: string[];
  };
  statistics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfit: number;
    totalLoss: number;
    profitFactor: number;
  };
}

interface Position {
  _id: string;
  mt5Ticket: number;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  stopLoss: number;
  takeProfit: number;
  openTime: string;
}

export default function MT5Page() {
  const [account, setAccount] = useState<MT5Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Connection form state
  const [connectionForm, setConnectionForm] = useState({
    mt5Login: '',
    mt5Password: '',
    mt5Server: ''
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    copyTradingEnabled: false,
    maxRiskPercent: 2,
    multiplier: 1,
    symbols: [] as string[]
  });

  useEffect(() => {
    loadAccount();
    loadPositions();
    
    // Set up auto-refresh every 5 seconds
    const interval = setInterval(() => {
      if (account) {
        loadAccount();
        loadPositions();
      }
    }, 5000);
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [account]);

  const loadAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/mt5/account'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 404) {
        setAccount(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load account');
      }

      const data = await response.json();
      setAccount(data);
      setSettingsForm({
        copyTradingEnabled: data.copyTradingEnabled || false,
        maxRiskPercent: data.copyTradingSettings?.maxRiskPercent || 2,
        multiplier: data.copyTradingSettings?.multiplier || 1,
        symbols: data.copyTradingSettings?.symbols || []
      });
      
      await loadPositions();
      
      // Set up auto-refresh
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      const interval = setInterval(() => {
        loadAccount();
        loadPositions();
      }, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      
      setLoading(false);
    } catch (error) {
      console.error('Load account error:', error);
      showToast('Failed to load MT5 account', 'error');
      setLoading(false);
    }
  };

  const loadPositions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/mt5/positions'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPositions(data);
      }
    } catch (error) {
      console.error('Load positions error:', error);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/mt5/connect'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(connectionForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      showToast('MT5 account connected successfully', 'success');
      setShowConnectModal(false);
      setConnectionForm({ mt5Login: '', mt5Password: '', mt5Server: '' });
      await loadAccount();
    } catch (error: any) {
      showToast(error.message || 'Failed to connect MT5 account', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/mt5/account/settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          copyTradingEnabled: settingsForm.copyTradingEnabled,
          copyTradingSettings: {
            maxRiskPercent: settingsForm.maxRiskPercent,
            multiplier: settingsForm.multiplier,
            symbols: settingsForm.symbols
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      showToast('Settings updated successfully', 'success');
      setShowSettingsModal(false);
      await loadAccount();
    } catch (error) {
      showToast('Failed to update settings', 'error');
    }
  };

  const handleClosePosition = async (ticket: number) => {
    if (!confirm('Are you sure you want to close this position?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/mt5/order/close'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticket })
      });

      if (!response.ok) {
        throw new Error('Failed to close position');
      }

      showToast('Position closed successfully', 'success');
      await loadPositions();
      await loadAccount();
    } catch (error) {
      showToast('Failed to close position', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading MT5 account...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <LinkIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Connect Your MT5 Account
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Link your MetaTrader 5 account to start trading and copy trading signals directly from the platform.
            </p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Connect MT5 Account
            </button>
          </motion.div>

          {/* Connect Modal */}
          {showConnectModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full"
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Connect MT5 Account
                </h3>
                <form onSubmit={handleConnect}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        MT5 Login
                      </label>
                      <input
                        type="number"
                        value={connectionForm.mt5Login}
                        onChange={(e) => setConnectionForm({ ...connectionForm, mt5Login: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        MT5 Password
                      </label>
                      <input
                        type="password"
                        value={connectionForm.mt5Password}
                        onChange={(e) => setConnectionForm({ ...connectionForm, mt5Password: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        MT5 Server
                      </label>
                      <input
                        type="text"
                        value={connectionForm.mt5Server}
                        onChange={(e) => setConnectionForm({ ...connectionForm, mt5Server: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., YourBroker-Demo"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowConnectModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={connecting}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                    >
                      {connecting ? 'Connecting...' : 'Connect'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                MT5 Trading Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Account: {account.mt5Login} | Server: {account.mt5Server}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => loadAccount()}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <RefreshCw className="w-5 h-5 inline mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <Settings className="w-5 h-5 inline mr-2" />
              Settings
            </button>
          </div>
        </div>

        {/* Account Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Balance</h3>
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {account.accountInfo.balance.toFixed(2)} {account.accountInfo.currency}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Equity</h3>
              <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {account.accountInfo.equity.toFixed(2)} {account.accountInfo.currency}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Free Margin</h3>
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {account.accountInfo.freeMargin.toFixed(2)} {account.accountInfo.currency}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Margin Level</h3>
              <Percent className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {account.accountInfo.marginLevel.toFixed(2)}%
            </p>
          </motion.div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Win Rate</h3>
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {account.statistics.winRate.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {account.statistics.winningTrades}W / {account.statistics.losingTrades}L
                </p>
              </div>
              <Activity className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Profit Factor</h3>
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {account.statistics.profitFactor.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Total: {account.statistics.totalTrades} trades
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Copy Trading</h3>
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {account.copyTradingEnabled ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center">
                      <CheckCircle className="w-5 h-5 inline mr-2" />
                      Enabled
                    </span>
                  ) : (
                    <span className="text-gray-400 flex items-center">
                      <XCircle className="w-5 h-5 inline mr-2" />
                      Disabled
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Risk: {account.copyTradingSettings.maxRiskPercent}%
                </p>
              </div>
              {account.copyTradingEnabled ? (
                <Zap className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <Pause className="w-12 h-12 text-gray-400" />
              )}
            </div>
          </motion.div>
        </div>

        {/* Open Positions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Open Positions</h2>
            <div className="flex gap-2">
              <button
                onClick={loadPositions}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                <RefreshCw className="w-4 h-4 inline mr-1" />
                Refresh
              </button>
              <Link
                href="/signals"
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy from Signals
              </Link>
            </div>
          </div>

          {positions.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No open positions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Symbol</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Volume</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Open Price</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Current Price</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Profit</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position._id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{position.symbol}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          position.type === 'BUY' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {position.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{position.volume}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{position.openPrice.toFixed(5)}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{position.currentPrice.toFixed(5)}</td>
                      <td className={`py-3 px-4 font-medium ${
                        position.profit >= 0 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {position.profit >= 0 ? '+' : ''}{position.profit.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleClosePosition(position.mt5Ticket)}
                          className="text-red-600 dark:text-red-400 hover:underline text-sm"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Trade History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trade History</h2>
            <button
              onClick={() => {
                setShowTradeHistory(!showTradeHistory);
                if (!showTradeHistory) {
                  loadTradeHistory();
                }
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 flex items-center"
            >
              <Clock className="w-4 h-4 mr-2" />
              {showTradeHistory ? 'Hide' : 'Show'} History
            </button>
          </div>

          {showTradeHistory && (
            <div className="overflow-x-auto">
              {tradeHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No trade history</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Symbol</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Volume</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Open Price</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Close Price</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Profit</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeHistory.map((trade) => (
                      <tr key={trade._id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{trade.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.type === 'BUY' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{trade.volume}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{trade.openPrice?.toFixed(5) || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{trade.closePrice?.toFixed(5) || 'N/A'}</td>
                        <td className={`py-3 px-4 font-medium ${
                          trade.profit >= 0 
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {trade.profit >= 0 ? '+' : ''}{trade.profit?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">
                          {trade.closeTime ? new Date(trade.closeTime).toLocaleDateString() : new Date(trade.openTime).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </motion.div>

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Copy Trading Settings
              </h3>
              <form onSubmit={handleUpdateSettings}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Copy Trading
                    </label>
                    <input
                      type="checkbox"
                      checked={settingsForm.copyTradingEnabled}
                      onChange={(e) => setSettingsForm({ ...settingsForm, copyTradingEnabled: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Risk Per Trade (%)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={settingsForm.maxRiskPercent}
                      onChange={(e) => setSettingsForm({ ...settingsForm, maxRiskPercent: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Volume Multiplier
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={settingsForm.multiplier}
                      onChange={(e) => setSettingsForm({ ...settingsForm, multiplier: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Save Settings
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

