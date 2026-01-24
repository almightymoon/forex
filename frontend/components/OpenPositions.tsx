'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, X, Edit2, DollarSign, Clock } from 'lucide-react';

interface Trade {
  _id: string;
  symbol: string;
  type: 'buy' | 'sell';
  entryPrice: number;
  lotSize: number;
  stopLoss?: number;
  takeProfit?: number;
  margin: number;
  entryTime: string;
  leverage: number;
  notes?: string;
}

interface OpenPositionsProps {
  refreshTrigger?: number;
  currentPrices?: Record<string, number>;
}

export default function OpenPositions({ refreshTrigger, currentPrices = {} }: OpenPositionsProps) {
  const [positions, setPositions] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [closePrice, setClosePrice] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);

  const fetchPositions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trades?status=open`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPositions(data.trades || []);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [refreshTrigger]);

  const handleCloseTrade = async () => {
    if (!selectedTrade || !closePrice) return;

    setIsClosing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/trades/${selectedTrade._id}/close`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            exitPrice: parseFloat(closePrice)
          })
        }
      );

      if (!res.ok) {
        throw new Error('Failed to close trade');
      }

      fetchPositions();
      setSelectedTrade(null);
      setClosePrice('');
    } catch (error) {
      console.error('Failed to close trade:', error);
      alert('Failed to close trade');
    } finally {
      setIsClosing(false);
    }
  };

  const calculatePL = (trade: Trade, currentPrice?: number) => {
    if (!currentPrice) return 0;
    
    const priceDiff = trade.type === 'buy' 
      ? (currentPrice - trade.entryPrice)
      : (trade.entryPrice - currentPrice);
    
    const lotValue = 100000;
    return priceDiff * trade.lotSize * lotValue;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">Loading positions...</div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No open positions</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Execute a trade to see it here</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Open Positions ({positions.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Symbol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lots</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">P/L</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SL/TP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {positions.map((trade) => {
                const currentPrice = currentPrices[trade.symbol] || trade.entryPrice;
                const pl = calculatePL(trade, currentPrice);
                const isProfitable = pl >= 0;

                return (
                  <tr key={trade._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
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
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{currentPrice.toFixed(5)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${
                        isProfitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {isProfitable ? '+' : ''}{pl.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {trade.stopLoss && <div>SL: {trade.stopLoss.toFixed(5)}</div>}
                        {trade.takeProfit && <div>TP: {trade.takeProfit.toFixed(5)}</div>}
                        {!trade.stopLoss && !trade.takeProfit && <div>-</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedTrade(trade);
                          setClosePrice(currentPrice.toFixed(5));
                        }}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Close Trade Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Close Position</h3>
              <button
                onClick={() => setSelectedTrade(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Symbol:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedTrade.symbol}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Type:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedTrade.type.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Lot Size:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedTrade.lotSize}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Entry Price:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedTrade.entryPrice.toFixed(5)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Close Price
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={closePrice}
                  onChange={(e) => setClosePrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedTrade(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseTrade}
                  disabled={isClosing || !closePrice}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isClosing ? 'Closing...' : 'Close Position'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
