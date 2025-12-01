import { useState, useEffect, useCallback, useRef } from 'react';
import { OrderBook } from '../types';
import {
  createOrder,
  getOrderbook,
  getUserOrders,
  createOrderbookWebSocket,
  CreateOrderRequest,
  OrderbookResponse,
  OrderMatchedMessage
} from '../services/orderbook';

interface UseOrderbookProps {
  userAddress?: string;
  symbol?: string;
}

interface UseOrderbookReturn {
  // State
  orderbook: OrderbookResponse | null;
  userOrders: OrderBook[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;

  // Actions
  placeOrder: (order: Omit<CreateOrderRequest, 'userAddress' | 'contractAddress'>) => Promise<void>;
  refreshOrderbook: () => Promise<void>;
  refreshUserOrders: () => Promise<void>;
}

export function useOrderbook({ userAddress, symbol }: UseOrderbookProps = {}): UseOrderbookReturn {
  const [orderbook, setOrderbook] = useState<OrderbookResponse | null>(null);
  const [userOrders, setUserOrders] = useState<OrderBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Default contract address (could be based on symbol in the future)
  const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';

  const refreshOrderbook = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getOrderbook();
      setOrderbook(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orderbook');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUserOrders = useCallback(async () => {
    if (!userAddress) return;

    try {
      setError(null);
      const orders = await getUserOrders(userAddress);
      setUserOrders(orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user orders');
    }
  }, [userAddress]);

  const placeOrder = useCallback(async (order: Omit<CreateOrderRequest, 'userAddress' | 'contractAddress'>) => {
    if (!userAddress) {
      setError('User address required to place order');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const orderRequest: CreateOrderRequest = {
        ...order,
        userAddress,
        contractAddress
      };

      await createOrder(orderRequest);

      // Refresh data after placing order
      await Promise.all([
        refreshOrderbook(),
        refreshUserOrders()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, contractAddress, refreshOrderbook, refreshUserOrders]);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return; // Already connected
      }

      wsRef.current = createOrderbookWebSocket(
        userAddress,
        (message) => {
          console.log('Orderbook message:', message);

          if (message.type === 'orderMatched') {
            const matchMessage = message as OrderMatchedMessage;

            // Refresh orderbook and user orders when a match occurs
            refreshOrderbook();
            if (userAddress) {
              refreshUserOrders();
            }

            // You could also show a notification here
            console.log(`Order matched: ${matchMessage.matchedAmount} @ ${matchMessage.matchPrice}`);
          }
        },
        (error) => {
          console.error('Orderbook WebSocket error:', error);
          setIsConnected(false);
          setError('WebSocket connection error');
        }
      );

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
      };
    };

    connectWebSocket();

    // Cleanup WebSocket on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [userAddress, refreshOrderbook, refreshUserOrders]);

  // Initial data loading
  useEffect(() => {
    refreshOrderbook();
  }, [refreshOrderbook]);

  useEffect(() => {
    if (userAddress) {
      refreshUserOrders();
    }
  }, [userAddress, refreshUserOrders]);

  // Auto-refresh orderbook every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrderbook();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshOrderbook]);

  return {
    orderbook,
    userOrders,
    isLoading,
    error,
    isConnected,
    placeOrder,
    refreshOrderbook,
    refreshUserOrders
  };
}