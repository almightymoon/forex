'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, BarChart3 } from 'lucide-react';

interface Trade {
  _id: string;
  symbol: string;
  type: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  lotSize: number;
  profitLoss?: number;
  netProfitLoss?: number;
  entryTime: string;
  exitTime?: string;
  status: string;
  notes?: string;
}

interface TradeStats {
  totalTrades: number;
  openTrades?: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfitLoss: number;
  avgProfitLoss: number;
  largestWin: number;
  largestLoss: number;
}

export default function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'closed' | 'open'>('all');

  useEffect(() => {
    fetchTrades();
    fetchStats();
  }, [filter]);

  const fetchTrades = async () => {
    try {
      const token = localStorage.getItem('token');
      const statusParam = filter === 'all' ? '' : `status=${filter}`;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/trades?${statusParam}&limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      setTrades(data.trades || []);
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trades/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (entryTime: string, exitTime?: string) => {
    const entry = new Date(entryTime);
    const exit = exitTime ? new Date(exitTime) : new Date();
    const diff = exit.getTime() - entry.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    }
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">Loading trade history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Trades</span>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTrades}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {stats.openTrades || 0} open positions
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Win Rate</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.winRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {stats.winningTrades}W / {stats.losingTrades}L
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Net P/L</span>
              <DollarSign className={`w-4 h-4 ${stats.netProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <div className={`text-2xl font-bold ${stats.netProfitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              ${stats.netProfitLoss.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Avg: ${stats.avgProfitLoss.toFixed(2)}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Best/Worst</span>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-sm">
              <div className="text-green-600 dark:text-green-400 font-semibold">
                +${stats.largestWin.toFixed(2)}
              </div>
              <div className="text-red-600 dark:text-red-400 font-semibold">
                ${stats.largestLoss.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Trade History</h3>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-3 py-1 rounded text-sm ${
                filter === 'closed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              Closed
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-3 py-1 rounded text-sm ${
                filter === 'open'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              Open
            </button>
          </div>
        </div>

        {trades.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No trades found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lots</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Exit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">P/L</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {trades.map((trade) => {
                  const isProfitable = (trade.netProfitLoss || 0) >= 0;

                  return (
                    <tr key={trade._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(trade.entryTime)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">{trade.symbol}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          trade.type === 'buy'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {trade.type === 'buy' ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {trade.type.toUpperCase()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{trade.lotSize}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{trade.entryPrice.toFixed(5)}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {trade.exitPrice ? trade.exitPrice.toFixed(5) : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {calculateDuration(trade.entryTime, trade.exitTime)}
                      </td>
                      <td className="px-4 py-3">
                        {trade.status === 'closed' ? (
                          <span className={`font-semibold ${
                            isProfitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {isProfitable ? '+' : ''}{(trade.netProfitLoss || 0).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          trade.status === 'open'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : trade.status === 'closed'
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
