import React from 'react';

export function SuggestionChips({ onSelect, pageContext = '/' }) {
  let suggestions = [
    "Today's summary",
    "Who was late this morning?",
    "How to enroll a student?",
    "Set morning start to 09:15"
  ];

  if (pageContext.includes('/attendance')) {
    suggestions = [
      "Who was late today?",
      "Who is absent?",
      "Mark absentees for morning",
      "Export today as CSV"
    ];
  } else if (pageContext.includes('/students')) {
    suggestions = [
      "How to re-enroll a student?",
      "Show inactive students",
      "How are duplicate faces checked?"
    ];
  } else if (pageContext.includes('/settings')) {
    suggestions = [
      "What is the ambiguity margin?",
      "How does strict liveness work?",
      "Set morning start to 09:15"
    ];
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 no-scrollbar">
      {suggestions.map((text, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(text)}
          className="whitespace-nowrap px-2.5 py-1 text-xs font-medium rounded-full bg-surface-2 text-main border border-line hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
