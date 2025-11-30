import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const navContainer = {
  hidden: { y: -100, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 20,
      staggerChildren: 0.1,
    },
  },
};

const navItem = {
  hidden: { y: -20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

export default function Navbar() {
  const location = useLocation();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backgroundColor: '#242931',
        borderBottom: '1px solid #434c5e'
      }}
      initial="hidden"
      animate="show"
      variants={navContainer}
    >
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo and brand */}
        <motion.div variants={navItem}>
          <Link to="/" className="flex items-center space-x-2">
            <motion.img
              src="/logo.png"
              alt="Ouro Logo"
              className="w-10 h-10 rounded-full"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
            <span className="text-xl font-bold" style={{
              color: '#eceff4'
            }}>Ouro</span>
          </Link>
        </motion.div>

        {/* Navigation menu */}
        <motion.div className="hidden lg:flex items-center space-x-8" variants={navItem}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              to="/markets"
              className={`transition-colors hover:opacity-80 ${location.pathname === '/markets' ? 'pb-1 border-b-2' : ''}`}
              style={{
                color: location.pathname === '/markets'
                  ? '#eceff4'
                  : '#d8dee9',
                borderBottomColor: location.pathname === '/markets'
                  ? '#5e81ac'
                  : 'transparent'
              }}
            >
              Markets
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              to="/trade"
              className={`flex items-center space-x-2 transition-colors hover:opacity-80 ${location.pathname.startsWith('/trade') ? 'pb-1 border-b-2' : ''}`}
              style={{
                color: location.pathname.startsWith('/trade')
                  ? '#eceff4'
                  : '#d8dee9',
                borderBottomColor: location.pathname.startsWith('/trade')
                  ? '#5e81ac'
                  : 'transparent'
              }}
            >
              <span>Trade</span>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/rewards" className="transition-colors hover:opacity-80" style={{
              color: '#d8dee9'
            }}>
              Rewards
            </Link>
          </motion.div>
          <Menu as="div" className="relative">
            <MenuButton className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors">
              <span>Earn</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </MenuButton>
            <MenuItems className="absolute right-0 mt-2 w-48 bg-[#262626] border border-gray-700 rounded-lg shadow-lg">
              <MenuItem>
                <Link to="/earn/staking" className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg">
                  Staking
                </Link>
              </MenuItem>
              <MenuItem>
                <Link to="/earn/liquidity" className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg">
                  Liquidity Mining
                </Link>
              </MenuItem>
            </MenuItems>
          </Menu>
          <Link to="/profile" className="text-gray-300 hover:text-white transition-colors">
            Profile
          </Link>
        </motion.div>

        {/* Right side - Simplified */}
        <motion.div className="flex items-center space-x-4" variants={navItem}>
          <motion.button
            className="px-6 py-2 font-semibold transition-colors hover:opacity-90"
            style={{
              backgroundColor: '#5e81ac',
              color: '#eceff4',
              borderRadius: '8px',
              border: 'none'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          >
            Connect Wallet
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
