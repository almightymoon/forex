"""
MT5 REST API Bridge
A Flask-based REST API that bridges Node.js backend with MetaTrader 5 terminal.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import logging

# Try to import MetaTrader5, handle if not available
try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    MT5_AVAILABLE = False
    logger.warning("MetaTrader5 library not available. MT5 bridge will run in mock mode.")

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import MetaTrader5, handle if not available
try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
    logger.info("MetaTrader5 library loaded successfully")
except ImportError:
    MT5_AVAILABLE = False
    logger.warning("MetaTrader5 library not available. Install MT5 terminal and MetaTrader5 package for full functionality.")
    # Create a mock mt5 module for development
    class MockMT5:
        @staticmethod
        def initialize():
            return False
        @staticmethod
        def last_error():
            return {'retcode': -1, 'description': 'MT5 not available'}
        @staticmethod
        def login(*args, **kwargs):
            return False
        @staticmethod
        def account_info():
            return None
        @staticmethod
        def symbol_info(*args):
            return None
        @staticmethod
        def symbols_get():
            return None
        @staticmethod
        def symbol_info_tick(*args):
            return None
        @staticmethod
        def copy_rates_range(*args):
            return None
        @staticmethod
        def order_send(*args):
            return type('obj', (object,), {'retcode': -1, 'comment': 'MT5 not available'})()
        @staticmethod
        def positions_get(*args):
            return None
        @staticmethod
        def history_deals_get(*args):
            return None
    mt5 = MockMT5()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Store active connections
active_connections = {}

def connect_mt5(login=None, password=None, server=None):
    """
    Connect to MT5 terminal
    """
    if not MT5_AVAILABLE:
        logger.warning("MT5 library not available. Running in compatibility mode.")
        return False
    
    try:
        # Initialize MT5
        if not mt5.initialize():
            error = mt5.last_error()
            logger.error(f"MT5 initialization failed: {error}")
            return None
        
        # If credentials provided, login
        if login and password and server:
            authorized = mt5.login(login=int(login), password=password, server=server)
            if not authorized:
                error = mt5.last_error()
                logger.error(f"MT5 login failed: {error}")
                return None
            logger.info(f"Connected to MT5 account: {login}")
        
        return True
    except Exception as e:
        logger.error(f"MT5 connection error: {str(e)}")
        return None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'MT5 REST API Bridge',
        'mt5_available': MT5_AVAILABLE,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/auth', methods=['POST'])
def authenticate():
    """
    Authenticate with MT5 and return a token
    """
    try:
        data = request.get_json()
        login = data.get('login')
        password = data.get('password')
        server = data.get('server')
        
        if not all([login, password, server]):
            return jsonify({
                'error': 'Missing required fields: login, password, server'
            }), 400
        
        # Check if MT5 is available
        if not MT5_AVAILABLE:
            return jsonify({
                'error': 'MT5 library not available. Please install MetaTrader5 terminal and Python package on the server.',
                'details': 'MetaTrader5 Python package requires MT5 terminal to be installed'
            }), 503
        
        # Connect to MT5
        if connect_mt5(login, password, server):
            # Generate a simple token (in production, use proper JWT)
            token = f"mt5_{login}_{datetime.now().timestamp()}"
            active_connections[token] = {
                'login': int(login),
                'password': password,
                'server': server,
                'connected_at': datetime.now().isoformat()
            }
            
            return jsonify({
                'token': token,
                'login': int(login),
                'server': server
            })
        else:
            error = mt5.last_error() if MT5_AVAILABLE else {'retcode': -1, 'description': 'MT5 not available'}
            return jsonify({
                'error': 'Failed to connect to MT5',
                'details': error
            }), 401
            
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        return jsonify({'error': str(e)}), 500

def verify_token(token):
    """Verify authentication token"""
    if not token:
        return None
    
    # Check if token exists in active connections
    if token in active_connections:
        conn = active_connections[token]
        # Reconnect if needed
        if connect_mt5(conn['login'], conn['password'], conn['server']):
            return conn
    return None

@app.route('/account/<int:login>', methods=['GET'])
def get_account_info(login):
    """
    Get account information
    """
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        conn = verify_token(token)
        
        if not conn:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get account info
        account_info = mt5.account_info()
        if account_info is None:
            return jsonify({'error': 'Failed to get account info', 'details': mt5.last_error()}), 500
        
        return jsonify({
            'login': account_info.login,
            'balance': account_info.balance,
            'equity': account_info.equity,
            'margin': account_info.margin,
            'freeMargin': account_info.margin_free,
            'marginLevel': account_info.margin_level,
            'currency': account_info.currency,
            'leverage': account_info.leverage,
            'server': account_info.server,
            'company': account_info.company
        })
        
    except Exception as e:
        logger.error(f"Get account info error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/symbol/<symbol>', methods=['GET'])
def get_symbol_info(symbol):
    """
    Get symbol information
    """
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        conn = verify_token(token)
        
        if not conn:
            return jsonify({'error': 'Unauthorized'}), 401
        
        symbol_info = mt5.symbol_info(symbol.upper())
        if symbol_info is None:
            return jsonify({'error': f'Symbol {symbol} not found'}), 404
        
        return jsonify({
            'name': symbol_info.name,
            'bid': symbol_info.bid,
            'ask': symbol_info.ask,
            'spread': symbol_info.spread,
            'contractSize': symbol_info.trade_contract_size,
            'digits': symbol_info.digits,
            'point': symbol_info.point,
            'tickSize': symbol_info.trade_tick_size,
            'tickValue': symbol_info.trade_tick_value,
            'lotStep': symbol_info.volume_step,
            'lotMin': symbol_info.volume_min,
            'lotMax': symbol_info.volume_max
        })
        
    except Exception as e:
        logger.error(f"Get symbol info error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/quotes', methods=['POST'])
def get_quotes():
    """
    Get market quotes for symbols
    """
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        conn = verify_token(token)
        
        if not conn:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        symbols = data.get('symbols', [])
        
        if not symbols:
            return jsonify({'error': 'No symbols provided'}), 400
        
        quotes = {}
        for symbol in symbols:
            tick = mt5.symbol_info_tick(symbol.upper())
            if tick:
                quotes[symbol] = {
                    'bid': tick.bid,
                    'ask': tick.ask,
                    'last': tick.last,
                    'volume': tick.volume,
                    'time': datetime.fromtimestamp(tick.time).isoformat()
                }
        
        return jsonify(quotes)
        
    except Exception as e:
        logger.error(f"Get quotes error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/symbols', methods=['GET'])
def get_symbols():
    """
    Get all available symbols
    """
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        conn = verify_token(token)
        
        if not conn:
            return jsonify({'error': 'Unauthorized'}), 401
        
        symbols = mt5.symbols_get()
        if symbols is None:
            return jsonify({'error': 'Failed to get symbols', 'details': mt5.last_error()}), 500
        
        symbol_list = [symbol.name for symbol in symbols]
        return jsonify(symbol_list)
        
    except Exception as e:
        logger.error(f"Get symbols error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/history', methods=['POST'])
def get_historical_data():
    """
    Get historical data (candles)
    """
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        conn = verify_token(token)
        
        if not conn:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        symbol = data.get('symbol')
        timeframe = data.get('timeframe', 'H1')
        from_date = datetime.fromisoformat(data.get('from'))
        to_date = datetime.fromisoformat(data.get('to'))
        
        # Map timeframe string to MT5 constant
        timeframe_map = {
            'M1': mt5.TIMEFRAME_M1,
            'M5': mt5.TIMEFRAME_M5,
            'M15': mt5.TIMEFRAME_M15,
            'M30': mt5.TIMEFRAME_M30,
            'H1': mt5.TIMEFRAME_H1,
            'H4': mt5.TIMEFRAME_H4,
            'D1': mt5.TIMEFRAME_D1,
            'W1': mt5.TIMEFRAME_W1,
            'MN1': mt5.TIMEFRAME_MN1
        }
        
        mt5_timeframe = timeframe_map.get(timeframe, mt5.TIMEFRAME_H1)
        
        rates = mt5.copy_rates_range(symbol.upper(), mt5_timeframe, from_date, to_date)
        if rates is None:
            return jsonify({'error': 'Failed to get historical data', 'details': mt5.last_error()}), 500
        
        # Convert to list of dicts
        candles = []
        for rate in rates:
            candles.append({
                'time': datetime.fromtimestamp(rate[0]).isoformat(),
                'open': float(rate[1]),
                'high': float(rate[2]),
                'low': float(rate[3]),
                'close': float(rate[4]),
                'tick_volume': int(rate[5]),
                'spread': int(rate[6]),
                'real_volume': int(rate[7]) if len(rate) > 7 else 0
            })
        
        return jsonify(candles)
        
    except Exception as e:
        logger.error(f"Get historical data error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/order', methods=['POST'])
def place_order():
    """
    Place a market order
    """
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        conn = verify_token(token)
        
        if not conn:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        symbol = data.get('symbol')
        order_type = data.get('type')  # 'BUY' or 'SELL'
        volume = data.get('volume')
        price = data.get('price', 0)  # 0 for market order
        slippage = data.get('slippage', 10)
        stop_loss = data.get('stopLoss', 0)
        take_profit = data.get('takeProfit', 0)
        comment = data.get('comment', 'MT5 API Order')
        
        # Prepare order request
        if order_type == 'BUY':
            order_type_mt5 = mt5.ORDER_TYPE_BUY
            if price == 0:
                price = mt5.symbol_info_tick(symbol.upper()).ask
        elif order_type == 'SELL':
            order_type_mt5 = mt5.ORDER_TYPE_SELL
            if price == 0:
                price = mt5.symbol_info_tick(symbol.upper()).bid
        else:
            return jsonify({'error': 'Invalid order type. Use BUY or SELL'}), 400
        
        request_dict = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol.upper(),
            "volume": float(volume),
            "type": order_type_mt5,
            "price": price,
            "deviation": slippage,
            "magic": 234000,
            "comment": comment,
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        if stop_loss > 0:
            request_dict["sl"] = stop_loss
        if take_profit > 0:
            request_dict["tp"] = take_profit
        
        # Send order
        result = mt5.order_send(request_dict)
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            return jsonify({
                'error': 'Order failed',
                'retcode': result.retcode,
                'comment': result.comment
            }), 400
        
        return jsonify({
            'ticket': result.order,
            'price': result.price,
            'volume': result.volume,
            'comment': result.comment
        })
        
    except Exception as e:
        logger.error(f"Place order error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/order/close', methods=['POST'])
def close_order():
    """
    Close an order/position
    """
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        conn = verify_token(token)
        
        if not conn:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        ticket = data.get('ticket')
        volume = data.get('volume', 0)  # 0 for full close
        
        # Get position info
        position = mt5.positions_get(ticket=ticket)
        if position is None or len(position) == 0:
            return jsonify({'error': 'Position not found'}), 404
        
        position = position[0]
        
        # Determine close type
        if position.type == mt5.ORDER_TYPE_BUY:
            order_type = mt5.ORDER_TYPE_SELL
            price = mt5.symbol_info_tick(position.symbol).bid
        else:
            order_type = mt5.ORDER_TYPE_BUY
            price = mt5.symbol_info_tick(position.symbol).ask
        
        close_volume = volume if volume > 0 else position.volume
        
        request_dict = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": position.symbol,
            "volume": float(close_volume),
            "type": order_type,
            "position": ticket,
            "price": price,
            "deviation": 10,
            "magic": 234000,
            "comment": "Close position",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        result = mt5.order_send(request_dict)
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            return jsonify({
                'error': 'Close order failed',
                'retcode': result.retcode,
                'comment': result.comment
            }), 400
        
        return jsonify({
            'ticket': result.order,
            'price': result.price,
            'profit': position.profit,
            'comment': result.comment
        })
        
    except Exception as e:
        logger.error(f"Close order error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/order/modify', methods=['POST'])
def modify_order():
    """
    Modify an order (stop loss, take profit)
    """
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        conn = verify_token(token)
        
        if not conn:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        ticket = data.get('ticket')
        stop_loss = data.get('stopLoss', 0)
        take_profit = data.get('takeProfit', 0)
        
        # Get position
        position = mt5.positions_get(ticket=ticket)
        if position is None or len(position) == 0:
            return jsonify({'error': 'Position not found'}), 404
        
        position = position[0]
        
        request_dict = {
            "action": mt5.TRADE_ACTION_SLTP,
            "symbol": position.symbol,
            "position": ticket,
        }
        
        if stop_loss > 0:
            request_dict["sl"] = stop_loss
        if take_profit > 0:
            request_dict["tp"] = take_profit
        
        result = mt5.order_send(request_dict)
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            return jsonify({
                'error': 'Modify order failed',
                'retcode': result.retcode,
                'comment': result.comment
            }), 400
        
        return jsonify({
            'ticket': ticket,
            'stopLoss': stop_loss,
            'takeProfit': take_profit,
            'comment': result.comment
        })
        
    except Exception as e:
        logger.error(f"Modify order error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/positions/<int:login>', methods=['GET'])
def get_positions(login):
    """
    Get open positions for an account
    """
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        conn = verify_token(token)
        
        if not conn:
            return jsonify({'error': 'Unauthorized'}), 401
        
        positions = mt5.positions_get()
        if positions is None:
            return jsonify([])
        
        positions_list = []
        for pos in positions:
            positions_list.append({
                'ticket': pos.ticket,
                'symbol': pos.symbol,
                'type': 'BUY' if pos.type == mt5.ORDER_TYPE_BUY else 'SELL',
                'volume': pos.volume,
                'priceOpen': pos.price_open,
                'priceCurrent': pos.price_current,
                'stopLoss': pos.sl,
                'takeProfit': pos.tp,
                'profit': pos.profit,
                'swap': pos.swap,
                'commission': pos.commission,
                'time': datetime.fromtimestamp(pos.time).isoformat(),
                'comment': pos.comment
            })
        
        return jsonify(positions_list)
        
    except Exception as e:
        logger.error(f"Get positions error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/history/<int:login>', methods=['POST'])
def get_order_history(login):
    """
    Get order history
    """
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        conn = verify_token(token)
        
        if not conn:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        from_date = datetime.fromisoformat(data.get('from'))
        to_date = datetime.fromisoformat(data.get('to'))
        
        deals = mt5.history_deals_get(from_date, to_date)
        if deals is None:
            return jsonify([])
        
        deals_list = []
        for deal in deals:
            deals_list.append({
                'ticket': deal.ticket,
                'order': deal.order,
                'symbol': deal.symbol,
                'type': 'BUY' if deal.type == mt5.DEAL_TYPE_BUY else 'SELL',
                'volume': deal.volume,
                'price': deal.price,
                'profit': deal.profit,
                'swap': deal.swap,
                'commission': deal.commission,
                'time': datetime.fromtimestamp(deal.time).isoformat(),
                'comment': deal.comment
            })
        
        return jsonify(deals_list)
        
    except Exception as e:
        logger.error(f"Get order history error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize MT5 on startup if available
    if MT5_AVAILABLE:
        if not mt5.initialize():
            logger.warning(f"MT5 initialization failed: {mt5.last_error()}")
            logger.warning("Bridge will run but MT5 operations may fail")
        else:
            logger.info("MT5 initialized successfully")
    else:
        logger.warning("MT5 library not available. Bridge running in compatibility mode.")
        logger.warning("Install MetaTrader5 terminal and Python package for full functionality.")
    
    # Get server config
    port = int(os.getenv('PORT', 8080))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting MT5 REST API Bridge on {host}:{port}")
    logger.info(f"MT5 Available: {MT5_AVAILABLE}")
    app.run(host=host, port=port, debug=debug)

