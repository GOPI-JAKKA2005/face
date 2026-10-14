/**
 * LLM Provider Adapter.
 * Integrates with Google Gemini or OpenAI compatible providers using native fetch.
 * Abstracted behind a standard chat completion and tool calling interface.
 */

import { getServerEnv } from './env.js';

export async function generateChatResponse({ messages, tools, systemPrompt }) {
  const env = getServerEnv();
  const apiKey = env.CHAT_PROVIDER_API_KEY;
  const configuredModel = env.CHAT_MODEL || 'gemini-3.5-flash';
  const modelCandidates = [configuredModel, 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'].filter((v, i, a) => a.indexOf(v) === i);

  if (!apiKey) {
    return {
      type: 'fallback',
      text: null,
      message: 'No LLM API key configured. Switch to offline rule engine.'
    };
  }

  // Format contents for Gemini API
  const contents = [];
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    contents.push({
      role,
      parts: [{ text: m.content || '' }]
    });
  }

  // Map tools if provided
  let geminiTools = undefined;
  if (tools && tools.length > 0) {
    geminiTools = [
      {
        functionDeclarations: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }
    ];
  }

  const payload = {
    contents,
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1000
    }
  };

  if (geminiTools) {
    payload.tools = geminiTools;
  }

  for (const modelName of modelCandidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`LLM API response on ${modelName} (${res.status}):`, errText);
        if (res.status === 404 || res.status === 503) {
          continue;
        }
        return { type: 'fallback', text: null, error: `LLM API responded with ${res.status}` };
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Check if tool call requested
      const toolCallPart = parts.find(p => p.functionCall);
      if (toolCallPart && toolCallPart.functionCall) {
        return {
          type: 'tool_call',
          name: toolCallPart.functionCall.name,
          args: toolCallPart.functionCall.args || {}
        };
      }

      const textPart = parts.find(p => p.text);
      return {
        type: 'text',
        text: textPart ? textPart.text : 'I could not generate a response.'
      };
    } catch (err) {
      console.warn(`LLM request error on ${modelName}:`, err.message);
    }
  }

  return { type: 'fallback', text: null, error: 'All Gemini model candidates unavailable' };
}
