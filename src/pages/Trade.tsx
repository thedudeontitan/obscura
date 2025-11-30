import React from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

export default function Trade() {
  const { symbol } = useParams();

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-20">
      <motion.div
        className="container mx-auto px-6 py-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item} className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Trading: {symbol || "Select Asset"}</h1>
          <p className="text-gray-400">Connect your wallet to start trading</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={item} className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Chart</h2>
              <div className="h-96 bg-gray-700 rounded flex items-center justify-center">
                <p className="text-gray-400">Trading chart placeholder</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Trading Panel</h2>
              <div className="space-y-4">
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-colors">
                  Buy
                </button>
                <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors">
                  Sell
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Wallet</h2>
              <p className="text-gray-400 text-center">Connect wallet to view balance</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}