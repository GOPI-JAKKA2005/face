import React, { useState } from 'react';
import { FiCopy, FiCheck, FiThumbsUp, FiThumbsDown, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { Button } from '../ui/Button.jsx';

export function MessageBubble({ message, onConfirmProposal, onCancelProposal }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-contrast rounded-br-none shadow-sm'
            : 'bg-surface-2 text-main border border-line rounded-bl-none'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>

        {/* Action Proposal Card */}
        {message.proposal && !message.proposalResolved && (
          <div className="mt-3 p-3 bg-surface border border-line rounded-token shadow-sm">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">
              Action Proposal
            </p>
            <p className="text-xs font-medium text-main mb-3">{message.proposal.title}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="accent"
                onClick={() => onConfirmProposal(message.proposal, message.id)}
              >
                <FiCheckCircle className="w-3.5 h-3.5 mr-1" />
                Confirm
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onCancelProposal(message.id)}
              >
                <FiXCircle className="w-3.5 h-3.5 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {message.proposal && message.proposalResolved && (
          <div className="mt-2 text-xs font-medium text-muted flex items-center gap-1">
            <FiCheckCircle className="w-3.5 h-3.5 text-success" />
            <span>Action completed</span>
          </div>
        )}
      </div>

      {!isUser && (
        <div className="flex items-center gap-2 mt-1 px-1 text-muted text-xs">
          <button
            type="button"
            onClick={handleCopy}
            className="hover:text-main p-1 transition-colors"
            title="Copy response"
          >
            {copied ? <FiCheck className="w-3 h-3 text-success" /> : <FiCopy className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={() => setFeedback('up')}
            className={`hover:text-main p-1 transition-colors ${feedback === 'up' ? 'text-success' : ''}`}
            title="Helpful"
          >
            <FiThumbsUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setFeedback('down')}
            className={`hover:text-main p-1 transition-colors ${feedback === 'down' ? 'text-danger' : ''}`}
            title="Not helpful"
          >
            <FiThumbsDown className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
