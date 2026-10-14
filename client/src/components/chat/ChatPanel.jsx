import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiSend, FiMic, FiTrash2, FiX } from 'react-icons/fi';
import { MessageBubble } from './MessageBubble.jsx';
import { SuggestionChips } from './SuggestionChips.jsx';
import { processOfflineRule } from '../../features/chatbot/ruleEngine.js';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';
import { Badge } from '../ui/Badge.jsx';

export function ChatPanel({ isOpen, onClose }) {
  const location = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello Admin! I am your FaceAttend assistant. Ask me questions about attendance data, student records, or system configuration.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBasicMode, setIsBasicMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      content: query.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Attempt serverless chat route first
      let data;
      try {
        data = await api.post('/chat', {
          messages: [...messages, userMsg],
          context: { page: location.pathname }
        }, { authRequired: true });
      } catch (_serverErr) {
        // Fallback to offline rule engine
        setIsBasicMode(true);
        data = await processOfflineRule(query, location.pathname);
      }

      if (data && (data.reply || data.content)) {
        setMessages(prev => [
          ...prev,
          {
            id: String(Date.now() + 1),
            role: 'assistant',
            content: data.reply || data.content,
            proposal: data.proposal || null
          }
        ]);
      } else {
        // Run rule engine
        setIsBasicMode(true);
        const ruleRes = await processOfflineRule(query, location.pathname);
        setMessages(prev => [
          ...prev,
          {
            id: String(Date.now() + 1),
            role: 'assistant',
            content: ruleRes.reply,
            proposal: ruleRes.proposal
          }
        ]);
      }
    } catch (err) {
      toast.error(err.message, 'Chat Error');
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.warning('Voice recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
      };

      recognition.start();
    } catch (_err) {
      setIsListening(false);
    }
  };

  const handleConfirmProposal = async (proposal, messageId) => {
    try {
      if (proposal.endpoint) {
        if (proposal.method === 'PUT') {
          await api.put(proposal.endpoint, proposal.payload, { authRequired: true });
        } else {
          await api.post(proposal.endpoint, proposal.payload, { authRequired: true });
        }
      }
      toast.success('Action executed successfully!', 'Confirmed');
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, proposalResolved: true } : m))
      );
    } catch (err) {
      toast.error(err.message, 'Action Failed');
    }
  };

  const handleCancelProposal = (messageId) => {
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, proposal: null } : m))
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-surface border-l border-line shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-line flex items-center justify-between bg-surface-2/50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-main text-base font-poppins">Admin Assistant</h3>
          {isBasicMode && <Badge variant="warning" size="sm">Basic Mode</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMessages([messages[0]])}
            aria-label="Clear chat"
            className="p-1.5 text-muted hover:text-main rounded hover:bg-surface transition-colors"
            title="Clear Chat"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat panel"
            className="p-1.5 text-muted hover:text-main rounded hover:bg-surface transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-2">
        {messages.map(m => (
          <MessageBubble
            key={m.id}
            message={m}
            onConfirmProposal={handleConfirmProposal}
            onCancelProposal={handleCancelProposal}
          />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-muted text-xs p-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span>Assistant is thinking...</span>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="px-3 border-t border-line/60 bg-surface">
        <SuggestionChips onSelect={(text) => handleSend(text)} pageContext={location.pathname} />
      </div>

      {/* Input Field */}
      <div className="p-3 border-t border-line bg-surface flex items-center gap-2">
        <button
          type="button"
          onClick={handleVoiceInput}
          aria-label="Voice input"
          className={`p-2 rounded-token transition-colors ${
            isListening ? 'bg-danger text-white animate-pulse' : 'text-muted hover:text-main hover:bg-surface-2'
          }`}
          title="Voice Input"
        >
          <FiMic className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question or give a command..."
          className="flex-1 bg-surface-2 border border-line rounded-token px-3 py-2 text-sm text-main placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          aria-label="Send message"
          className="p-2 rounded-token bg-primary text-primary-contrast disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <FiSend className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
