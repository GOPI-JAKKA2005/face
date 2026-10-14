import React, { useState, useRef, useEffect } from 'react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { MessageBubble } from '../../components/chat/MessageBubble.jsx';
import { SuggestionChips } from '../../components/chat/SuggestionChips.jsx';
import { processOfflineRule } from './ruleEngine.js';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';
import { FiSend, FiMic, FiTrash2 } from 'react-icons/fi';

export function ChatbotPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to your FaceAttend AI Assistant! You can ask questions about student attendance records, request daily summaries, or ask for changes to session timings with confirmation cards.'
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
      let data;
      try {
        data = await api.post('/chat', {
          messages: [...messages, userMsg],
          context: { page: '/admin/chat' }
        }, { authRequired: true });
      } catch (_serverErr) {
        setIsBasicMode(true);
        data = await processOfflineRule(query, '/admin/chat');
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
        setIsBasicMode(true);
        const fallback = await processOfflineRule(query, '/admin/chat');
        setMessages(prev => [
          ...prev,
          {
            id: String(Date.now() + 1),
            role: 'assistant',
            content: fallback.reply,
            proposal: fallback.proposal
          }
        ]);
      }
    } catch (err) {
      toast.error(err.message, 'Chat Error');
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
        const text = event.results[0][0].transcript;
        setInput(text);
        handleSend(text);
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
      toast.success('Action successfully executed!', 'Confirmed');
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, proposalResolved: true } : m))
      );
    } catch (err) {
      toast.error(err.message, 'Execution Failed');
    }
  };

  const handleCancelProposal = (messageId) => {
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, proposal: null } : m))
    );
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <PageHeader
          title="Admin AI Assistant"
          description="Natural language queries, daily audits, and guided administrative actions."
          className="mb-0"
        />
        <div className="flex items-center gap-2">
          {isBasicMode && <Badge variant="warning">Basic Rule Mode</Badge>}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setMessages([messages[0]])}
          >
            <FiTrash2 className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Main Chat Conversation Container */}
      <Card className="flex-1 overflow-hidden p-0 flex flex-col bg-surface shadow-md border-line">
        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-3">
          {messages.map(m => (
            <MessageBubble
              key={m.id}
              message={m}
              onConfirmProposal={handleConfirmProposal}
              onCancelProposal={handleCancelProposal}
            />
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-muted text-xs p-3">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              <span>Analyzing attendance data...</span>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 border-t border-line bg-surface-2/40">
          <SuggestionChips onSelect={(text) => handleSend(text)} pageContext="/admin/chat" />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-line bg-surface flex items-center gap-3">
          <button
            type="button"
            onClick={handleVoiceInput}
            aria-label="Voice input"
            className={`p-2.5 rounded-token transition-colors ${
              isListening ? 'bg-danger text-white animate-pulse' : 'text-muted hover:text-main hover:bg-surface-2'
            }`}
          >
            <FiMic className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your question or instruction..."
            className="flex-1 bg-surface-2 border border-line rounded-token px-4 py-2.5 text-sm text-main placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <Button
            variant="primary"
            disabled={!input.trim() || loading}
            onClick={() => handleSend()}
            className="px-5"
          >
            <FiSend className="w-4 h-4 mr-1.5" />
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
