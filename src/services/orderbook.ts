/**
 * Orderbook service for interacting with the orderbook backend
 */

import { OrderBook } from '../types';

const ORDERBOOK_API_URL = process.env.VITE_ORDERBOOK_API_URL || 'http://localhost:3000';
const ORDERBOOK_WS_URL = process.env.VITE_ORDERBOOK_WS_URL || 'ws://localhost:8080';

export interface CreateOrderRequest {
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  userAddress: string;
  contractAddress: string;
}

export interface OrderbookResponse {
  buyOrders: Array<{ id: string; price: number; amount: number }>;
  sellOrders: Array<{ id: string; price: number; amount: number }>;
}

export interface OrderMatchedMessage {
  type: 'orderMatched';
  order: OrderBook;
  matchedAmount: number;
  matchPrice: number;
}

/**
 * Create a new order
 */
export async function createOrder(orderRequest: CreateOrderRequest): Promise<OrderBook> {
  const response = await fetch(`${ORDERBOOK_API_URL}/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderRequest),
  });

  if (!response.ok) {
    throw new Error(`Failed to create order: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get current orderbook data
 */
export async function getOrderbook(): Promise<OrderbookResponse> {
  const response = await fetch(`${ORDERBOOK_API_URL}/orderbook`);

  if (!response.ok) {
    throw new Error(`Failed to fetch orderbook: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all orders
 */
export async function getAllOrders(): Promise<OrderBook[]> {
  const response = await fetch(`${ORDERBOOK_API_URL}/orders`);

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get orders for a specific user
 */
export async function getUserOrders(userAddress: string): Promise<OrderBook[]> {
  const response = await fetch(`${ORDERBOOK_API_URL}/orders/${userAddress}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch user orders: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create WebSocket connection to orderbook
 */
export function createOrderbookWebSocket(
  userAddress?: string,
  onMessage?: (message: any) => void,
  onError?: (error: Event) => void
): WebSocket {
  const ws = new WebSocket(ORDERBOOK_WS_URL);

  ws.onopen = () => {
    console.log('Orderbook WebSocket connected');

    // Subscribe to user updates if address provided
    if (userAddress) {
      ws.send(JSON.stringify({
        type: 'subscribe',
        userAddress: userAddress
      }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      onMessage?.(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('Orderbook WebSocket error:', error);
    onError?.(error);
  };

  ws.onclose = () => {
    console.log('Orderbook WebSocket disconnected');
  };

  return ws;
}