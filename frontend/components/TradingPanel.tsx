'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Shield, X, AlertCircle } from 'lucide-react';

interface TradingPanelProps {
  symbol: string;
  currentPrice?: number;
  onTradeExecuted?: () => void;
}

export default function TradingPanel({ symbol, currentPrice = 0, onTradeExecuted }: TradingPanelProps) {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [lotSize, setLotSize] = useState<string>('0.01');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [leverage, setLeverage] = useState<string>('1');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [userBalance, setUserBalance] = useState<number>(0);
  const [calculatedMargin, setCalculatedMargin] = useState<number>(0);

  // Fetch user balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.user) {
          setUserBalance(data.user.balance || 0);
        }
      } catch (err) {
        console.error('Failed to fetch balance:', err);
      }
    };
    fetchBalance();
  }, []);

  // Calculate margin when inputs change
  useEffect(() => {
    const lot = parseFloat(lotSize) || 0;
    const lev = parseFloat(leverage) || 1;
    const price = currentPrice || 0;
    
    if (lot > 0 && price > 0) {
      const lotValue = 100000; // Standard forex lot
      const notionalValue = price * lot * lotValue;
      const margin = notionalValue / lev;
      setCalculatedMargin(margin);
    } else {
      setCalculatedMargin(0);
    }
  }, [lotSize, leverage, currentPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    const lot = parseFloat(lotSize);
    if (!lot || lot < 0.01) {
      setError('Minimum lot size is 0.01');
      return;
    }

    if (!currentPrice || currentPrice <= 0) {
      setError('Invalid current price');
      return;
    }

    if (calculatedMargin > userBalance) {
      setError(`Insufficient balance. Required: $${calculatedMargin.toFixed(2)}, Available: $${userBalance.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: symbol.replace('FX:', '').replace('OANDA:', '').replace('BINANCE:', ''),
          type: tradeType,
          entryPrice: currentPrice,
          lotSize: lot,
          stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
          takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
          leverage: parseFloat(leverage) || 1,
          notes
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute trade');
      }

      setSuccess(`${tradeType.toUpperCase()} order executed successfully!`);
      setLotSize('0.01');
      setStopLoss('');
      setTakeProfit('');
      setNotes('');
      setUserBalance(prev => prev - calculatedMargin);
      
      if (onTradeExecuted) {
        onTradeExecuted();
      }

      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to execute trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Trade Panel</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Balance:</span>
          <span className="font-medium text-gray-900 dark:text-white">${userBalance.toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Trade Type */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTradeType('buy')}
            className={`py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
              tradeType === 'buy'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            BUY
          </button>
          <button
            type="button"
            onClick={() => setTradeType('sell')}
            className={`py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
              tradeType === 'sell'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            SELL
          </button>
        </div>

        {/* Current Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Current Price
          </label>
          <div className="flex items-center px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
            <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
            <span className="font-medium text-gray-900 dark:text-white">
              {currentPrice.toFixed(5)}
            </span>
          </div>
        </div>

        {/* Lot Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Lot Size
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="0.01"
          />
        </div>

        {/* Leverage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Leverage
          </label>
          <select
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">1:1</option>
            <option value="10">1:10</option>
            <option value="20">1:20</option>
            <option value="50">1:50</option>
            <option value="100">1:100</option>
            <option value="200">1:200</option>
            <option value="500">1:500</option>
          </select>
        </div>

        {/* Stop Loss */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Shield className="w-4 h-4 mr-1" />
            Stop Loss (Optional)
          </label>
          <input
            type="number"
            step="0.00001"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Enter stop loss price"
          />
        </div>

        {/* Take Profit */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Target className="w-4 h-4 mr-1" />
            Take Profit (Optional)
          </label>
          <input
            type="number"
            step="0.00001"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Enter take profit price"
          />
        </div>

        {/* Margin Required */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-800 dark:text-blue-200 font-medium">Margin Required:</span>
            <span className="font-bold text-blue-900 dark:text-blue-100">
              ${calculatedMargin.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Add trade notes..."
          />
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-green-800 dark:text-green-200">{success}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || calculatedMargin > userBalance}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            tradeType === 'buy'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSubmitting ? 'Executing...' : `${tradeType.toUpperCase()} ${symbol}`}
        </button>
      </form>
    </div>
  );
}
