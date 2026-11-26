import { loadSecret } from './secure-store';
import { getGrounding } from './search';
import type { AIMessage } from '../shared/types';

function extractText(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const chunks: string[] = [];
  for (const item of payload?.output ?? []) {
    for (const part of item?.content ?? []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

export async function askAI(prompt: string, history: AIMessage[], pageContext?: { title: string; url: string; text: string }): Promise<AIMessage> {
  const key = await loadSecret('OPENAI_API_KEY');
  if (!key) throw new Error('OpenAI is not configured. Add an OpenAI API key in Settings → AI.');
  const userText = prompt.trim().slice(0, 6000);
  if (!userText) throw new Error('Write a question first.');

  const grounding = await getGrounding(userText);
  const transcript = history.slice(-12).map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n');
  const page = pageContext
    ? `\n\nCURRENT PAGE (captured because the user explicitly requested page-aware help):\nTitle: ${pageContext.title}\nURL: ${pageContext.url}\nText:\n${pageContext.text.slice(0, 18000)}`
    : '';
  const web = grounding.text
    ? `\n\nLIVE WEB SEARCH CONTEXT (cite sources by their bracket numbers; do not invent sources):\n${grounding.text}`
    : '\n\nLive web sources were unavailable for this turn. Be clear when information may be out of date and do not invent citations.';
  const input = [
    'You are NOVA, a careful browser AI assistant. Be accurate, helpful, and concise. Distinguish facts from uncertainty.',
    'When live sources are provided, include bracket citations such as [1] near relevant claims and only cite the supplied sources. If no live sources are provided, do not fabricate citations.',
    'Do not claim to have visited or verified a site unless its content is in the provided context.',
    transcript ? `RECENT CONVERSATION:\n${transcript}` : '',
    page,
    web,
    `USER QUESTION:\n${userText}`,
  ].filter(Boolean).join('\n\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', input, store: false }),
    signal: AbortSignal.timeout(60000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message ?? `OpenAI request failed (${response.status}).`;
    throw new Error(String(detail).slice(0, 500));
  }
  const content = extractText(payload);
  if (!content) throw new Error('The AI provider returned an empty response.');
  return { role: 'assistant', content, sources: grounding.sources };
}
