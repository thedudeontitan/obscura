const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const cors = require("cors");

const app = express();

// Redis configuration with fallback to in-memory storage
let redis;
let useRedis = false;
const inMemoryStorage = new Map(); // Fallback storage

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
    lazyConnect: true
  });

  redis.on('connect', () => {
    console.log('Connected to Redis');
    useRedis = true;
  });

  redis.on('error', (err) => {
    console.warn('Redis connection failed, falling back to in-memory storage:', err.message);
    useRedis = false;
  });

  // Test connection
  redis.ping().then(() => {
    useRedis = true;
  }).catch(() => {
    console.warn('Redis not available, using in-memory storage for development');
    useRedis = false;
  });
} catch (error) {
  console.warn('Redis initialization failed, using in-memory storage:', error.message);
  useRedis = false;
}

app.use(express.json());
app.use(cors());

// WebSocket server setup
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();

wss.on('connection', (ws) => {
  const id = uuidv4();
  const metadata = { id };

  clients.set(ws, metadata);

  console.log(`New WebSocket connection: ${id}`);

  ws.on('message', (messageAsString) => {
    const message = JSON.parse(messageAsString);
    const metadata = clients.get(ws);

    if (message.type === 'subscribe') {
      metadata.userAddress = message.userAddress;
      console.log(`Client ${metadata.id} subscribed to address ${metadata.userAddress}`);
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket connection closed: ${id}`);
    clients.delete(ws);
  });
});

function notifyUser(userAddress, message) {
  const matchingClients = Array.from(clients.entries())
    .filter(([client, metadata]) => metadata.userAddress === userAddress);
  
  matchingClients.forEach(([client, metadata]) => {
    client.send(JSON.stringify(message));
  });
}

// Storage abstraction layer
const storage = {
  async hset(key, value) {
    if (useRedis) {
      return await redis.hset(key, value);
    } else {
      inMemoryStorage.set(key, { ...value });
      return true;
    }
  },

  async hgetall(key) {
    if (useRedis) {
      return await redis.hgetall(key);
    } else {
      return inMemoryStorage.get(key) || {};
    }
  },

  async zadd(key, score, member) {
    if (useRedis) {
      return await redis.zadd(key, score, member);
    } else {
      const setKey = `${key}:sorted`;
      if (!inMemoryStorage.has(setKey)) {
        inMemoryStorage.set(setKey, []);
      }
      const sortedSet = inMemoryStorage.get(setKey);
      sortedSet.push({ score, member });
      sortedSet.sort((a, b) => a.score - b.score);
      return true;
    }
  },

  async zrevrange(key, start, stop, withScores) {
    if (useRedis) {
      return await redis.zrevrange(key, start, stop, withScores);
    } else {
      const setKey = `${key}:sorted`;
      const sortedSet = inMemoryStorage.get(setKey) || [];
      const reversed = [...sortedSet].reverse();
      if (withScores === 'WITHSCORES') {
        return reversed.flatMap(item => [item.member, item.score]);
      }
      return reversed.map(item => item.member);
    }
  },

  async zrange(key, start, stop, withScores) {
    if (useRedis) {
      return await redis.zrange(key, start, stop, withScores);
    } else {
      const setKey = `${key}:sorted`;
      const sortedSet = inMemoryStorage.get(setKey) || [];
      if (withScores === 'WITHSCORES') {
        return sortedSet.flatMap(item => [item.member, item.score]);
      }
      return sortedSet.map(item => item.member);
    }
  },

  async zrem(key, member) {
    if (useRedis) {
      return await redis.zrem(key, member);
    } else {
      const setKey = `${key}:sorted`;
      const sortedSet = inMemoryStorage.get(setKey) || [];
      const index = sortedSet.findIndex(item => item.member === member);
      if (index > -1) {
        sortedSet.splice(index, 1);
        return 1;
      }
      return 0;
    }
  },

  async del(key) {
    if (useRedis) {
      return await redis.del(key);
    } else {
      return inMemoryStorage.delete(key);
    }
  }
};

// Helper function to create a new order
async function createOrder(type, price, amount, userAddress, contractAddress) {
  const orderId = uuidv4();
  const order = { id: orderId, type, price, amount, userAddress, contractAddress, timestamp: Date.now() };
  await storage.hset(`orders:${orderId}`, order);
  await storage.zadd(`orderbook:${type}`, price, orderId);
  return order;
}

// Helper function to match orders
async function matchOrders() {
  const buyOrders = await storage.zrevrange('orderbook:buy', 0, -1, 'WITHSCORES');
  const sellOrders = await storage.zrange('orderbook:sell', 0, -1, 'WITHSCORES');

  let buyIndex = 0;
  let sellIndex = 0;

  while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
    const buyOrderId = buyOrders[buyIndex];
    const buyPrice = parseFloat(buyOrders[buyIndex + 1]);
    const sellOrderId = sellOrders[sellIndex];
    const sellPrice = parseFloat(sellOrders[sellIndex + 1]);

    if (buyPrice >= sellPrice) {
      const buyOrder = await storage.hgetall(`orders:${buyOrderId}`);
      const sellOrder = await storage.hgetall(`orders:${sellOrderId}`);

      const matchedAmount = Math.min(parseFloat(buyOrder.amount), parseFloat(sellOrder.amount));
      const matchPrice = sellPrice;

      // Update orders
      await storage.hset(`orders:${buyOrderId}`, { ...buyOrder, amount: parseFloat(buyOrder.amount) - matchedAmount });
      await storage.hset(`orders:${sellOrderId}`, { ...sellOrder, amount: parseFloat(sellOrder.amount) - matchedAmount });

      // Notify users
      notifyUser(buyOrder.userAddress, {
        type: 'orderMatched',
        order: buyOrder,
        matchedAmount,
        matchPrice
      });
      notifyUser(sellOrder.userAddress, {
        type: 'orderMatched',
        order: sellOrder,
        matchedAmount,
        matchPrice
      });

      // Remove filled orders
      if (parseFloat(buyOrder.amount) - matchedAmount <= 0) {
        await storage.zrem('orderbook:buy', buyOrderId);
        await storage.del(`orders:${buyOrderId}`);
        buyIndex += 2;
      }
      if (parseFloat(sellOrder.amount) - matchedAmount <= 0) {
        await storage.zrem('orderbook:sell', sellOrderId);
        await storage.del(`orders:${sellOrderId}`);
        sellIndex += 2;
      }

      console.log(`Matched: ${matchedAmount} @ ${matchPrice} (Buy: ${buyOrderId}, Sell: ${sellOrderId})`);
    } else {
      break;
    }
  }
}

// API endpoint to place a new order
app.post('/order', async (req, res) => {
  const { type, price, amount, userAddress, contractAddress } = req.body;

  if (!['buy', 'sell'].includes(type) || !price || !amount || !userAddress || !contractAddress) {
    return res.status(400).json({ error: 'Invalid order parameters' });
  }

  const order = await createOrder(type, parseFloat(price), parseFloat(amount), userAddress, contractAddress);
  await matchOrders();

  res.json(order);
});

// API endpoint to get the current order book
app.get('/orderbook', async (req, res) => {
  const buyOrders = await storage.zrevrange('orderbook:buy', 0, -1, 'WITHSCORES');
  const sellOrders = await storage.zrange('orderbook:sell', 0, -1, 'WITHSCORES');

  const formatOrders = (orders) => {
    const result = [];
    for (let i = 0; i < orders.length; i += 2) {
      result.push({ id: orders[i], price: parseFloat(orders[i + 1]) });
    }
    return result;
  };

  res.json({
    buyOrders: formatOrders(buyOrders),
    sellOrders: formatOrders(sellOrders),
  });
});

// API endpoint to get all orders
app.get('/orders', async (req, res) => {
  const buyOrderIds = await storage.zrevrange('orderbook:buy', 0, -1);
  const sellOrderIds = await storage.zrevrange('orderbook:sell', 0, -1);
  const allOrderIds = [...buyOrderIds, ...sellOrderIds];

  const orders = await Promise.all(allOrderIds.map(id => storage.hgetall(`orders:${id}`)));

  // Sort orders by timestamp, most recent first
  orders.sort((a, b) => b.timestamp - a.timestamp);

  res.json(orders);
});

// API endpoint to get orders for a specific user
app.get('/orders/:userAddress', async (req, res) => {
  const { userAddress } = req.params;
  const buyOrderIds = await storage.zrevrange('orderbook:buy', 0, -1);
  const sellOrderIds = await storage.zrevrange('orderbook:sell', 0, -1);
  const allOrderIds = [...buyOrderIds, ...sellOrderIds];

  const allOrders = await Promise.all(allOrderIds.map(id => storage.hgetall(`orders:${id}`)));
  const userOrders = allOrders.filter(order => order.userAddress === userAddress);

  // Sort orders by timestamp, most recent first
  userOrders.sort((a, b) => b.timestamp - a.timestamp);

  res.json(userOrders);
});

const EXPRESS_PORT = process.env.EXPRESS_PORT || 3000;
app.listen(EXPRESS_PORT, () => {
  console.log(`Express server listening on port ${EXPRESS_PORT}`);
});

console.log(`WebSocket server listening on ws://localhost:8080`);