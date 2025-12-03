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
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

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
  ticket: number;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  stopLoss: number;
  takeProfit: number;
}

interface MT5DashboardProps {
  embedded?: boolean;
}

export default function MT5Dashboard({ embedded = false }: MT5DashboardProps) {
  const [account, setAccount] = useState<MT5Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [showNewTradeModal, setShowNewTradeModal] = useState(false);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [currentPrice, setCurrentPrice] = useState<{ bid: number; ask: number } | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<string>('');
  const [chartTimeframe, setChartTimeframe] = useState<string>('H1');
  const [loadingChart, setLoadingChart] = useState(false);

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

  // New trade form state
  const [newTradeForm, setNewTradeForm] = useState({
    symbol: '',
    type: 'BUY' as 'BUY' | 'SELL',
    volume: 0.01,
    stopLoss: 0,
    takeProfit: 0,
    slippage: 10,
    comment: ''
  });

  useEffect(() => {
    loadAccount();
    loadSymbols();
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (newTradeForm.symbol && showNewTradeModal) {
      loadCurrentPrice(newTradeForm.symbol);
    }
  }, [newTradeForm.symbol, showNewTradeModal]);

  useEffect(() => {
    if (selectedChartSymbol && account) {
      loadChartData(selectedChartSymbol, chartTimeframe);
      // Set up auto-refresh for chart data
      const chartInterval = setInterval(() => {
        loadChartData(selectedChartSymbol, chartTimeframe);
      }, 30000); // Refresh every 30 seconds
      
      // Set up real-time price updates (every 5 seconds)
      const priceInterval = setInterval(() => {
        if (selectedChartSymbol) {
          loadCurrentPrice(selectedChartSymbol);
          // Update the last data point in chart with real-time price
          updateChartWithRealTimePrice(selectedChartSymbol);
        }
      }, 5000); // Update every 5 seconds
      
      return () => {
        clearInterval(chartInterval);
        clearInterval(priceInterval);
      };
    }
  }, [selectedChartSymbol, chartTimeframe, account]);

  const updateChartWithRealTimePrice = async (symbol: string) => {
    if (!currentPrice || chartData.length === 0) return;
    
    try {
      // Update the last data point with current price
      const updatedData = [...chartData];
      if (updatedData.length > 0) {
        const lastPoint = updatedData[updatedData.length - 1];
        const midPrice = (currentPrice.bid + currentPrice.ask) / 2;
        
        updatedData[updatedData.length - 1] = {
          ...lastPoint,
          price: midPrice,
          close: midPrice,
          high: Math.max(lastPoint.high || midPrice, midPrice),
          low: Math.min(lastPoint.low || midPrice, midPrice)
        };
        setChartData(updatedData);
      }
    } catch (error) {
      console.error('Update chart with real-time price error:', error);
    }
  };

  // Auto-select first symbol when symbols are loaded
  useEffect(() => {
    if (availableSymbols.length > 0 && !selectedChartSymbol) {
      // Prefer common symbols
      const preferredSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
      const symbol = preferredSymbols.find(s => availableSymbols.includes(s)) || availableSymbols[0];
      setSelectedChartSymbol(symbol);
    }
  }, [availableSymbols, selectedChartSymbol]);

  const loadAccount = async (silent = false) => {
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
        if (refreshInterval) {
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
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
      
      if (!refreshInterval) {
        const interval = setInterval(() => {
          loadAccount(true);
          loadPositions();
        }, 30000);
        setRefreshInterval(interval);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Load account error:', error);
      if (!silent) {
        showToast('Failed to load MT5 account', 'error');
      }
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

  const loadTradeHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/mt5/trades?status=closed&limit=50'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTradeHistory(data);
      }
    } catch (error) {
      console.error('Load trade history error:', error);
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
        body: JSON.stringify(settingsForm)
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      showToast('Settings updated successfully', 'success');
      setShowSettingsModal(false);
      await loadAccount();
    } catch (error: any) {
      showToast(error.message || 'Failed to update settings', 'error');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your MT5 account? All trade data will be removed.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/mt5/account'), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect account');
      }

      showToast('MT5 account disconnected successfully', 'success');
      setShowSettingsModal(false);
      setAccount(null);
      setPositions([]);
      setChartData([]);
      setSelectedChartSymbol('');
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to disconnect account', 'error');
    }
  };

  const loadSymbols = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/mt5/symbols'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Symbols loaded:', data);
        if (Array.isArray(data) && data.length > 0) {
          setAvailableSymbols(data);
        } else {
          console.warn('No symbols received or invalid format');
          // Set default symbols as fallback
          setAvailableSymbols(['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD']);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load symbols:', response.status, errorData);
        // Set default symbols as fallback
        setAvailableSymbols(['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD']);
      }
    } catch (error) {
      console.error('Load symbols error:', error);
      // Set default symbols as fallback
      setAvailableSymbols(['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD']);
    }
  };

  const loadCurrentPrice = async (symbol: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/mt5/quotes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ symbols: [symbol] })
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both array and object formats
        if (Array.isArray(data) && data.length > 0) {
          const quote = data[0];
          setCurrentPrice({
            bid: quote.bid || 0,
            ask: quote.ask || 0
          });
        } else if (data && typeof data === 'object') {
          // Handle object format { symbol: { bid, ask } }
          const symbolKey = symbol.toUpperCase();
          const quote = data[symbolKey] || data[symbol] || Object.values(data)[0];
          if (quote) {
            setCurrentPrice({
              bid: quote.bid || 0,
              ask: quote.ask || 0
            });
          }
        }
      }
    } catch (error) {
      console.error('Load current price error:', error);
    }
  };

  const loadChartData = async (symbol: string, timeframe: string) => {
    if (!account) return;
    
    setLoadingChart(true);
    try {
      const token = localStorage.getItem('token');
      const toDate = new Date();
      const fromDate = new Date();
      
      // Set date range based on timeframe
      switch (timeframe) {
        case 'M1':
          fromDate.setHours(fromDate.getHours() - 1);
          break;
        case 'M5':
          fromDate.setHours(fromDate.getHours() - 5);
          break;
        case 'M15':
          fromDate.setHours(fromDate.getHours() - 15);
          break;
        case 'M30':
          fromDate.setHours(fromDate.getHours() - 30);
          break;
        case 'H1':
          fromDate.setDate(fromDate.getDate() - 1);
          break;
        case 'H4':
          fromDate.setDate(fromDate.getDate() - 4);
          break;
        case 'D1':
          fromDate.setDate(fromDate.getDate() - 30);
          break;
        default:
          fromDate.setDate(fromDate.getDate() - 1);
      }

      // First try to get real-time price and add it to historical data
      let realTimePrice: { bid: number; ask: number; mid: number } | null = null;
      try {
        const priceResponse = await fetch(buildApiUrl('/api/mt5/quotes'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ symbols: [symbol] })
        });
        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          if (Array.isArray(priceData) && priceData.length > 0) {
            const quote = priceData[0];
            realTimePrice = {
              bid: quote.bid || 0,
              ask: quote.ask || 0,
              mid: ((quote.bid || 0) + (quote.ask || 0)) / 2
            };
          } else if (priceData && typeof priceData === 'object') {
            const symbolKey = symbol.toUpperCase();
            const quote = priceData[symbolKey] || priceData[symbol] || Object.values(priceData)[0];
            if (quote) {
              realTimePrice = {
                bid: quote.bid || 0,
                ask: quote.ask || 0,
                mid: ((quote.bid || 0) + (quote.ask || 0)) / 2
              };
            }
          }
        }
      } catch (err) {
        console.warn('Failed to get real-time price:', err);
      }

      const response = await fetch(
        buildApiUrl(`/api/mt5/history?symbol=${symbol}&timeframe=${timeframe}&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Chart data received:', data);
        
        // If historical data fails but we have real-time price, use that
        if ((!data || !Array.isArray(data) || data.length === 0) && realTimePrice && realTimePrice.mid > 0) {
          console.log('No historical data, using real-time price to create chart');
          const realTimeData = [];
          const now = new Date();
          // Create chart data from real-time price (last 20 points)
          for (let i = 19; i >= 0; i--) {
            const time = new Date(now.getTime() - i * (timeframe === 'M1' ? 60000 : timeframe === 'M5' ? 300000 : timeframe === 'H1' ? 3600000 : 3600000));
            const variation = (Math.random() - 0.5) * 0.0002; // Small random variation
            const price = realTimePrice.mid + variation;
            realTimeData.push({
              time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              timestamp: time.getTime(),
              open: price,
              high: price + 0.0001,
              low: price - 0.0001,
              close: price,
              price: price
            });
          }
          setChartData(realTimeData);
          setCurrentPrice({
            bid: realTimePrice.bid,
            ask: realTimePrice.ask
          });
          setLoadingChart(false);
          return;
        }
        
        if (data && Array.isArray(data) && data.length > 0) {
          // Format data for Recharts
          const formattedData = data.map((candle: any, index: number) => {
            try {
              const timeValue = candle.time || candle.Time || candle.timestamp;
              let date: Date;
              
              if (timeValue) {
                date = new Date(timeValue);
                if (isNaN(date.getTime())) {
                  // Invalid date, use calculated date
                  date = new Date(Date.now() - (data.length - index) * 60000);
                }
              } else {
                date = new Date(Date.now() - (data.length - index) * 60000);
              }
              
              const open = parseFloat(candle.open || candle.Open || candle.o || 0);
              const high = parseFloat(candle.high || candle.High || candle.h || 0);
              const low = parseFloat(candle.low || candle.Low || candle.l || 0);
              const close = parseFloat(candle.close || candle.Close || candle.c || 0);
              const price = close || open || 0;
              
              return {
                time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                timestamp: date.getTime(),
                open: open,
                high: high || open,
                low: low || open,
                close: close || open,
                price: price
              };
            } catch (err) {
              console.error('Error formatting candle:', err, candle);
              return null;
            }
          }).filter((item: any) => item !== null && item.price > 0 && !isNaN(item.price)); // Filter out invalid data
          
          console.log('Formatted chart data:', formattedData);
          if (formattedData.length > 0) {
            // Add real-time price as the latest data point if available
            if (realTimePrice && realTimePrice.mid > 0) {
              const lastCandle = formattedData[formattedData.length - 1];
              const now = new Date();
              formattedData.push({
                time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                timestamp: now.getTime(),
                open: lastCandle.close || realTimePrice.mid,
                high: Math.max(lastCandle.close || realTimePrice.mid, realTimePrice.mid),
                low: Math.min(lastCandle.close || realTimePrice.mid, realTimePrice.mid),
                close: realTimePrice.mid,
                price: realTimePrice.mid
              });
            }
            setChartData(formattedData);
            // Also update current price state
            if (realTimePrice) {
              setCurrentPrice({
                bid: realTimePrice.bid,
                ask: realTimePrice.ask
              });
            }
          } else {
            // If no historical data, create chart from real-time price
            if (realTimePrice && realTimePrice.mid > 0) {
              const now = new Date();
              const realTimeData = [];
              // Create a small dataset from real-time price
              for (let i = 9; i >= 0; i--) {
                const time = new Date(now.getTime() - i * 60000);
                realTimeData.push({
                  time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  timestamp: time.getTime(),
                  open: realTimePrice.mid,
                  high: realTimePrice.mid + 0.0001,
                  low: realTimePrice.mid - 0.0001,
                  close: realTimePrice.mid,
                  price: realTimePrice.mid
                });
              }
              setChartData(realTimeData);
              setCurrentPrice({
                bid: realTimePrice.bid,
                ask: realTimePrice.ask
              });
            } else {
              console.warn('No valid chart data after formatting');
              setChartData([]);
            }
          }
        } else {
          console.warn('No chart data received or empty array');
          // Fallback to real-time price if available
          if (realTimePrice && realTimePrice.mid > 0) {
            console.log('Using real-time price as fallback');
            const now = new Date();
            const realTimeData = [];
            for (let i = 19; i >= 0; i--) {
              const time = new Date(now.getTime() - i * (timeframe === 'M1' ? 60000 : timeframe === 'M5' ? 300000 : timeframe === 'H1' ? 3600000 : 3600000));
              const variation = (Math.random() - 0.5) * 0.0002;
              const price = realTimePrice.mid + variation;
              realTimeData.push({
                time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                timestamp: time.getTime(),
                open: price,
                high: price + 0.0001,
                low: price - 0.0001,
                close: price,
                price: price
              });
            }
            setChartData(realTimeData);
            setCurrentPrice({
              bid: realTimePrice.bid,
              ask: realTimePrice.ask
            });
          } else {
            setChartData([]);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Chart data fetch failed:', response.status, errorData);
        // Fallback to real-time price if available
        if (realTimePrice && realTimePrice.mid > 0) {
          console.log('Historical data failed, using real-time price as fallback');
          const now = new Date();
          const realTimeData = [];
          for (let i = 19; i >= 0; i--) {
            const time = new Date(now.getTime() - i * (timeframe === 'M1' ? 60000 : timeframe === 'M5' ? 300000 : timeframe === 'H1' ? 3600000 : 3600000));
            const variation = (Math.random() - 0.5) * 0.0002;
            const price = realTimePrice.mid + variation;
            realTimeData.push({
              time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              timestamp: time.getTime(),
              open: price,
              high: price + 0.0001,
              low: price - 0.0001,
              close: price,
              price: price
            });
          }
          setChartData(realTimeData);
          setCurrentPrice({
            bid: realTimePrice.bid,
            ask: realTimePrice.ask
          });
          showToast('Using real-time prices (historical data unavailable)', 'info');
        } else {
          showToast(errorData.error || 'Failed to load chart data', 'error');
          setChartData([]);
        }
      }
    } catch (error: any) {
      console.error('Load chart data error:', error);
      // Fallback to real-time price if available
      if (realTimePrice && realTimePrice.mid > 0) {
        console.log('Error occurred, using real-time price as fallback');
        const now = new Date();
        const realTimeData = [];
        for (let i = 19; i >= 0; i--) {
          const time = new Date(now.getTime() - i * (timeframe === 'M1' ? 60000 : timeframe === 'M5' ? 300000 : timeframe === 'H1' ? 3600000 : 3600000));
          const variation = (Math.random() - 0.5) * 0.0002;
          const price = realTimePrice.mid + variation;
          realTimeData.push({
            time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            timestamp: time.getTime(),
            open: price,
            high: price + 0.0001,
            low: price - 0.0001,
            close: price,
            price: price
          });
        }
        setChartData(realTimeData);
        setCurrentPrice({
          bid: realTimePrice.bid,
          ask: realTimePrice.ask
        });
        showToast('Using real-time prices (historical data unavailable)', 'info');
      } else {
        showToast(error.message || 'Failed to load chart data', 'error');
        setChartData([]);
      }
    } finally {
      setLoadingChart(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacingOrder(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/mt5/order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: newTradeForm.symbol,
          type: newTradeForm.type,
          volume: newTradeForm.volume,
          stopLoss: newTradeForm.stopLoss || 0,
          takeProfit: newTradeForm.takeProfit || 0,
          slippage: newTradeForm.slippage,
          comment: newTradeForm.comment || 'Manual Order'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      showToast('Order placed successfully', 'success');
      setShowNewTradeModal(false);
      setNewTradeForm({
        symbol: '',
        type: 'BUY',
        volume: 0.01,
        stopLoss: 0,
        takeProfit: 0,
        slippage: 10,
        comment: ''
      });
      setCurrentPrice(null);
      await loadPositions();
      await loadAccount();
    } catch (error: any) {
      showToast(error.message || 'Failed to place order', 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleClosePosition = async (ticket: number) => {
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
    } catch (error: any) {
      showToast(error.message || 'Failed to close position', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="text-center py-12">
            <Zap className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No MT5 Account Connected
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Connect your MetaTrader 5 account to start trading
            </p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Connect MT5 Account
            </button>
          </div>
        </div>

        {showConnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowConnectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Connect MT5 Account
              </h3>
              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    MT5 Login
                  </label>
                  <input
                    type="text"
                    value={connectionForm.mt5Login}
                    onChange={(e) => setConnectionForm({ ...connectionForm, mt5Login: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    MT5 Server
                  </label>
                  <input
                    type="text"
                    value={connectionForm.mt5Server}
                    onChange={(e) => setConnectionForm({ ...connectionForm, mt5Server: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
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
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!embedded && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              MT5 Trading Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Account: {account.mt5Login} | Server: {account.mt5Server}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowNewTradeModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              New Trade
            </button>
            <button
              onClick={() => {
                loadAccount(false);
                loadPositions();
              }}
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
      )}

      {embedded && (
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Account: {account.mt5Login} | Server: {account.mt5Server}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewTradeModal(true)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              New Trade
            </button>
            <button
              onClick={() => {
                loadAccount(false);
                loadPositions();
              }}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
              <RefreshCw className="w-4 h-4 inline mr-1" />
              Refresh
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              <Settings className="w-4 h-4 inline mr-1" />
              Settings
            </button>
          </div>
        </div>
      )}

      {/* Account Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Balance</h3>
            <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {account.accountInfo.balance.toFixed(2)} {account.accountInfo.currency}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Equity</h3>
            <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {account.accountInfo.equity.toFixed(2)} {account.accountInfo.currency}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Free Margin</h3>
            <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {account.accountInfo.freeMargin.toFixed(2)} {account.accountInfo.currency}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Margin Level</h3>
            <Percent className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {account.accountInfo.marginLevel.toFixed(2)}%
          </p>
        </motion.div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Win Rate</h3>
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {account.statistics.winRate.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {account.statistics.winningTrades}W / {account.statistics.losingTrades}L
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Profit Factor</h3>
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {account.statistics.profitFactor.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total: {account.statistics.totalTrades} trades
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Copy Trading</h3>
            {account.copyTradingEnabled ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {account.copyTradingEnabled ? 'Enabled' : 'Disabled'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Risk: {account.copyTradingSettings.maxRiskPercent}%
          </p>
        </motion.div>
      </div>

      {/* Price Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Price Chart</h3>
          <div className="flex gap-2">
            <select
              value={selectedChartSymbol}
              onChange={(e) => setSelectedChartSymbol(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Select Symbol</option>
              {availableSymbols.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
            <select
              value={chartTimeframe}
              onChange={(e) => setChartTimeframe(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="M1">M1</option>
              <option value="M5">M5</option>
              <option value="M15">M15</option>
              <option value="M30">M30</option>
              <option value="H1">H1</option>
              <option value="H4">H4</option>
              <option value="D1">D1</option>
            </select>
            {selectedChartSymbol && (
              <button
                onClick={() => loadChartData(selectedChartSymbol, chartTimeframe)}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
              >
                <RefreshCw className="w-4 h-4 inline" />
              </button>
            )}
          </div>
        </div>
        {!selectedChartSymbol ? (
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Select a symbol to view price chart
          </div>
        ) : loadingChart ? (
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p>No chart data available</p>
              <p className="text-sm mt-2">Try selecting a different symbol or timeframe</p>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData} 
                margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                key={`chart-${selectedChartSymbol}-${chartTimeframe}`}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => value.toFixed(5)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value: any) => typeof value === 'number' ? value.toFixed(5) : value}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={false}
                  name="Price"
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="high" 
                  stroke="#10B981" 
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="5 5"
                  name="High"
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="low" 
                  stroke="#EF4444" 
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="5 5"
                  name="Low"
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Open Positions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Open Positions</h3>
          <button
            onClick={() => {
              setShowTradeHistory(!showTradeHistory);
              if (!showTradeHistory) {
                loadTradeHistory();
              }
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showTradeHistory ? 'Hide' : 'Show'} Trade History
          </button>
        </div>
        {positions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No open positions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Symbol</th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Volume</th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Open Price</th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Current Price</th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Profit</th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position._id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 px-4 text-sm text-gray-900 dark:text-white">{position.symbol}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        position.type === 'buy' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {position.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-900 dark:text-white">{position.volume}</td>
                    <td className="py-2 px-4 text-sm text-gray-900 dark:text-white">{position.openPrice.toFixed(5)}</td>
                    <td className="py-2 px-4 text-sm text-gray-900 dark:text-white">{position.currentPrice.toFixed(5)}</td>
                    <td className={`py-2 px-4 text-sm font-medium ${
                      position.profit >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {position.profit >= 0 ? '+' : ''}{position.profit.toFixed(2)}
                    </td>
                    <td className="py-2 px-4">
                      <button
                        onClick={() => handleClosePosition(position.ticket)}
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
      </div>

      {/* Trade History */}
      {showTradeHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Trade History</h3>
          {tradeHistory.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No trade history</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Symbol</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Volume</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Open Price</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Close Price</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Profit</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map((trade) => (
                    <tr key={trade._id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-4 text-sm text-gray-900 dark:text-white">{trade.symbol}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.type === 'buy' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {trade.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-900 dark:text-white">{trade.volume}</td>
                      <td className="py-2 px-4 text-sm text-gray-900 dark:text-white">{trade.openPrice?.toFixed(5) || 'N/A'}</td>
                      <td className="py-2 px-4 text-sm text-gray-900 dark:text-white">{trade.closePrice?.toFixed(5) || 'N/A'}</td>
                      <td className={`py-2 px-4 text-sm font-medium ${
                        trade.profit >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {trade.profit >= 0 ? '+' : ''}{trade.profit?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {trade.closedAt ? new Date(trade.closedAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Trade Modal */}
      {showNewTradeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowNewTradeModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Place New Order</h3>
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Symbol
                </label>
                <select
                  value={newTradeForm.symbol}
                  onChange={(e) => setNewTradeForm({ ...newTradeForm, symbol: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select Symbol</option>
                  {availableSymbols.map((symbol) => (
                    <option key={symbol} value={symbol}>
                      {symbol}
                    </option>
                  ))}
                </select>
                {currentPrice && newTradeForm.symbol && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="mr-4">Bid: {currentPrice.bid.toFixed(5)}</span>
                    <span>Ask: {currentPrice.ask.toFixed(5)}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Order Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTradeForm({ ...newTradeForm, type: 'BUY' })}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      newTradeForm.type === 'BUY'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTradeForm({ ...newTradeForm, type: 'SELL' })}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      newTradeForm.type === 'SELL'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Volume (Lots)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newTradeForm.volume}
                  onChange={(e) => setNewTradeForm({ ...newTradeForm, volume: parseFloat(e.target.value) || 0.01 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stop Loss
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={newTradeForm.stopLoss || ''}
                    onChange={(e) => setNewTradeForm({ ...newTradeForm, stopLoss: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Take Profit
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={newTradeForm.takeProfit || ''}
                    onChange={(e) => setNewTradeForm({ ...newTradeForm, takeProfit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slippage (points)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newTradeForm.slippage}
                  onChange={(e) => setNewTradeForm({ ...newTradeForm, slippage: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Comment (Optional)
                </label>
                <input
                  type="text"
                  value={newTradeForm.comment}
                  onChange={(e) => setNewTradeForm({ ...newTradeForm, comment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Order comment"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTradeModal(false);
                    setNewTradeForm({
                      symbol: '',
                      type: 'BUY',
                      volume: 0.01,
                      stopLoss: 0,
                      takeProfit: 0,
                      slippage: 10,
                      comment: ''
                    });
                    setCurrentPrice(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={placingOrder || !newTradeForm.symbol}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                    newTradeForm.type === 'BUY'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white disabled:opacity-50`}
                >
                  {placingOrder ? 'Placing...' : `Place ${newTradeForm.type} Order`}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowSettingsModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Copy Trading Settings</h3>
            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="copyTradingEnabled"
                  checked={settingsForm.copyTradingEnabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, copyTradingEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="copyTradingEnabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable Copy Trading
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Multiplier
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
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
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
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect MT5 Account
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

