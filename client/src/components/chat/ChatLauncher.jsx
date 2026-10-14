import React, { useState } from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { ChatPanel } from './ChatPanel.jsx';

export function ChatLauncher() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
        className="fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6 w-12 h-12 rounded-full bg-primary text-primary-contrast shadow-xl flex items-center justify-center hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <FiMessageSquare className="w-6 h-6" />
      </motion.button>

      <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
