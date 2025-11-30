import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to Trading Platform</h1>
          <p className="text-xl text-gray-400">Your gateway to digital asset trading</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Portfolio</h2>
            <p className="text-gray-400 mb-4">Connect your wallet to view your portfolio</p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">
              Connect Wallet
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Markets</h2>
            <p className="text-gray-400 mb-4">Explore available trading pairs</p>
            <Link
              to="/markets"
              className="block w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors text-center"
            >
              View Markets
            </Link>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Trade</h2>
            <p className="text-gray-400 mb-4">Start trading instantly</p>
            <Link
              to="/trade"
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors text-center"
            >
              Start Trading
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}