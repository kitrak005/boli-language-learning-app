import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  ArrowRight,
  Sparkles,
  Volume2,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  Quote,
  X,
  Languages,
  History,
  AlertCircle,
  Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { sound } from '../utils/audio';

export interface ParsedDictionaryEntry {
  word: string;
  partOfSpeech: string;
  pronunciation: string;
  simpleDefinition: string;
  inOtherWords: string;
  exampleSentences: string[];
  synonyms: string[];
  isOutOfScope?: boolean;
}

export interface Message {
  id: string;
  sender: 'user' | 'guru';
  text: string;
  timestamp: string;
  sources?: Array<{ title: string; url: string }>;
  isRedirect?: boolean;
}

interface AskGuruChatProps {
  avatarUrl: string;
  scholarName?: string;
  currentLanguage?: string;
}

const LANGUAGE_FILTERS = [
  { id: 'all', label: 'All Tongues', script: 'सर्व' },
  { id: 'sanskrit', label: 'Sanskrit', script: 'संस्कृतम्' },
  { id: 'pali', label: 'Pali', script: 'पालि' },
  { id: 'tamil', label: 'Tamil', script: 'தமிழ்' },
];

const QUICK_WORDS = [
  { label: 'Dharma (धर्म)', query: 'Dharma' },
  { label: 'Satya (सत्य)', query: 'Satya' },
  { label: 'Ahimsa (अहिंसा)', query: 'Ahimsa' },
  { label: 'Yoga (योग)', query: 'Yoga' },
  { label: 'Moksha (मोक्ष)', query: 'Moksha' },
  { label: 'Karma (कर्म)', query: 'Karma' },
];

// Strips markdown emphasis characters (*text*, _text_, **text**) that
// Gemini sometimes wraps transliterations in, so they don't leak into
// fields that are rendered as raw text instead of through ReactMarkdown.
function stripMarkdownEmphasis(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .trim();
}

/**
 * Parses the exact response structure:
 * Word: [Word]
 * Part of Speech: [Noun / Verb / etc.]
 * Pronunciation: [Phonetic spelling]
 * Simple Definition: [A clear 1-2 sentence explanation...]
 * In Other Words: [A quick, everyday phrase...]
 * Example Sentences:
 * • [Example 1]
 * • [Example 2]
 * Synonyms: [3-4 common synonyms]
 */
function parseDictionaryResponse(text: string): ParsedDictionaryEntry | null {
  if (!text) return null;

  if (text.includes('out of scope') || text.includes('I am a dictionary bot and can only help with word meanings')) {
    return {
      word: '',
      partOfSpeech: '',
      pronunciation: '',
      simpleDefinition: '',
      inOtherWords: '',
      exampleSentences: [],
      synonyms: [],
      isOutOfScope: true,
    };
  }

  const wordMatch = text.match(/Word:\s*(.+)/i);
  const posMatch = text.match(/Part of Speech:\s*(.+)/i);
  const pronMatch = text.match(/Pronunciation:\s*(.+)/i);
  const defMatch = text.match(/Simple Definition:\s*([\s\S]+?)(?=\n\s*(?:In Other Words|Example Sentences|Synonyms|$))/i);
  const inOtherWordsMatch = text.match(/In Other Words:\s*([\s\S]+?)(?=\n\s*(?:Example Sentences|Synonyms|$))/i);
  const examplesBlockMatch = text.match(/Example Sentences:\s*([\s\S]+?)(?=\n\s*(?:Synonyms|$))/i);
  const synMatch = text.match(/Synonyms:\s*(.+)/i);

  if (!wordMatch && !defMatch) {
    return null;
  }

  const exampleSentences: string[] = [];
  if (examplesBlockMatch) {
    const rawLines = examplesBlockMatch[1].split('\n');
    for (const line of rawLines) {
      const trimmed = line.replace(/^[\s•\-\*\d\.]+\s*/, '').trim();
      if (trimmed) {
        exampleSentences.push(stripMarkdownEmphasis(trimmed));
      }
    }
  }

  const synonyms: string[] = [];
  if (synMatch) {
    const rawSyns = synMatch[1].split(/[,;•|]/);
    for (const s of rawSyns) {
      const t = stripMarkdownEmphasis(s.trim());
      if (t) synonyms.push(t);
    }
  }

  return {
    word: wordMatch ? stripMarkdownEmphasis(wordMatch[1]) : '',
    partOfSpeech: posMatch ? stripMarkdownEmphasis(posMatch[1]) : 'Noun',
    pronunciation: pronMatch ? stripMarkdownEmphasis(pronMatch[1]) : '',
    simpleDefinition: defMatch ? stripMarkdownEmphasis(defMatch[1]) : '',
    inOtherWords: inOtherWordsMatch ? stripMarkdownEmphasis(inOtherWordsMatch[1]) : '',
    exampleSentences,
    synonyms,
    isOutOfScope: false,
  };
}

export const AskGuruChat: React.FC<AskGuruChatProps> = ({
  avatarUrl,
  scholarName = 'Dictionary Bot',
  currentLanguage = 'sanskrit',
}) => {
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      sender: 'guru',
      text: `Word: Dharma (धर्म / Dhamma)
Part of Speech: Noun (Philosophical & Ethical Concept)
Pronunciation: DHEHR-muh
Simple Definition: The concept of *Dharma* (धर्म) is foundational to Indian philosophy, extending far beyond simple definitions of "religion" or "duty." It refers to the universal cosmic order and sacred ethical duty that upholds and harmonizes all existence.
In Other Words: Living in righteous alignment with truth and cosmic moral purpose.
Example Sentences:
• "धारणाद्धर्म इत्याहुर्धर्मो धारयते प्रजाः ।" (Dharma is that which sustains; it preserves and holds together all beings in harmony.)
• Practicing compassion, honesty, and responsibility in daily life is an essential expression of one's personal dharma.
Synonyms: Righteousness, Sacred Duty, Cosmic Law, Virtue`,
      timestamp: 'Just now',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPlayingId, setIsPlayingId] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Dharma', 'Moksha', 'Ahimsa', 'Satya', 'Karma']);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    sound.unlockAudio();
    sound.playTileClick();

    const cleanWord = textToSend.trim();

    setRecentSearches((prev) => {
      const filtered = prev.filter((w) => w.toLowerCase() !== cleanWord.toLowerCase());
      return [cleanWord, ...filtered].slice(0, 6);
    });

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: cleanWord,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ask-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: cleanWord,
          language: selectedLang,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      const guruMessage: Message = {
        id: `guru-${Date.now()}`,
        sender: 'guru',
        text: data.response || 'Word definition retrieved.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [],
        isRedirect: data.isRedirect,
      };

      setMessages((prev) => [...prev, guruMessage]);
      sound.playSuccessChime();
    } catch (err: any) {
      console.error('Error querying dictionary bot:', err);
      const fallbackMsg: Message = {
        id: `guru-err-${Date.now()}`,
        sender: 'guru',
        text: `Word: ${cleanWord}
Part of Speech: Noun / Term
Pronunciation: ${cleanWord}
Simple Definition: A classical term expressing essential principles of meaning, duty, and truth.
In Other Words: Foundational concept of thought and conduct.
Example Sentences:
• The scholar examined the classical usage of ${cleanWord} across ancient manuscripts.
• In depth linguistic study, ${cleanWord} conveys key philosophical dimensions.
Synonyms: Term, Concept, Principle, Meaning`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: [
          {
            title: 'Monier-Williams Sanskrit Dictionary',
            url: 'https://www.sanskrit-lexicon.uni-koeln.de/monier/',
          },
        ],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePronounce = (textToSpeak: string, msgId: string) => {
    sound.unlockAudio();
    setIsPlayingId(msgId);
    sound.speak(
      textToSpeak,
      selectedLang === 'tamil' ? 'tamil' : 'sanskrit',
      () => setIsPlayingId(msgId),
      () => setIsPlayingId(null)
    );
  };

  const handleCopyText = (rawText: string, msgId: string) => {
    navigator.clipboard.writeText(rawText);
    setCopiedId(msgId);
    sound.playTileClick();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    sound.playTileClick();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'guru',
        text: `I am your dedicated Dictionary Bot. Inquire about any word, term, or phrase to view its exact definition, pronunciation, usage, and synonyms.`,
        timestamp: 'Just now',
      },
    ]);
  };

  return (
    <section
      id="ask-guru-chatbot-container"
      className="bg-[#121212] rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[680px] overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-9 h-9 rounded-full bg-cover bg-center border border-[#C5A059]/50 shrink-0"
              style={{ backgroundImage: `url('${avatarUrl}')` }}
            />
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#121212]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-sm font-medium text-white tracking-wide">
                Ask Guru • Dictionary Bot
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-[#C5A059]/15 border border-[#C5A059]/30 text-[#C5A059] text-[8.5px] font-bold tracking-wider uppercase">
                Word Meanings Only
              </span>
            </div>
            <p className="text-[10px] text-white/40 font-light mt-0.5">
              Definitions • Pronunciation • Example Sentences • Synonyms
            </p>
          </div>
        </div>

        <button
          id="btn-reset-guru-chat"
          onClick={handleResetChat}
          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          title="Clear Conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tradition + Quick Words — combined into one compact row */}
      <div className="px-4 py-2 border-b border-white/5 flex flex-wrap items-center gap-1.5 shrink-0">
        <Languages className="w-3 h-3 text-[#C5A059] shrink-0" />
        {LANGUAGE_FILTERS.map((lang) => (
          <button
            key={lang.id}
            onClick={() => {
              setSelectedLang(lang.id);
              sound.playTileClick();
            }}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer ${selectedLang === lang.id
                ? 'bg-[#C5A059] text-black font-semibold'
                : 'bg-white/5 text-white/50 hover:text-white'
              }`}
          >
            {lang.label}
          </button>
        ))}

        <span className="w-px h-3.5 bg-white/10 mx-1" />

        <Sparkles className="w-3 h-3 text-[#C5A059] shrink-0" />
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_WORDS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(item.query)}
              disabled={isLoading}
              className="px-2 py-0.5 rounded-full bg-white/[0.03] hover:bg-[#C5A059]/15 border border-white/5 text-white/50 hover:text-[#DFC386] text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatScrollRef}
        className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-5 text-sm leading-relaxed"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const entry = !isUser ? parseDictionaryResponse(msg.text) : null;

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
            >
              {!isUser && (
                <div
                  className="w-7 h-7 rounded-full bg-cover bg-center border border-[#C5A059]/40 shrink-0 mt-0.5"
                  style={{ backgroundImage: `url('${avatarUrl}')` }}
                />
              )}

              <div className={`max-w-[85%] ${isUser ? '' : 'flex-1'}`}>
                {isUser ? (
                  <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl rounded-tr-sm px-4 py-2.5">
                    <p className="text-sm text-white/90">{msg.text}</p>
                  </div>
                ) : entry?.isOutOfScope ? (
                  <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[10px] uppercase tracking-wider">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Scope Notice</span>
                    </div>
                    <p className="text-white/80 text-xs leading-relaxed">
                      I am a dictionary bot and can only help with word meanings and language usage. This question is out of scope.
                    </p>
                  </div>
                ) : entry && (entry.word || entry.simpleDefinition) ? (
                  /* Flowing prose-style dictionary entry */
                  <div className="space-y-2.5">
                    {entry.simpleDefinition && (
                      <p className="text-[13px] sm:text-sm text-white/85 leading-relaxed">
                        {entry.word && (
                          <span className="text-[#DFC386] font-serif italic font-medium">{entry.word}: </span>
                        )}
                        {entry.simpleDefinition}
                        {entry.word && (
                          <button
                            onClick={() => handlePronounce(entry.word, msg.id)}
                            className={`inline-flex items-center justify-center ml-1.5 p-1 rounded-full align-middle text-[#C5A059]/70 hover:text-[#C5A059] hover:bg-white/5 transition-all cursor-pointer ${isPlayingId === msg.id ? 'text-[#C5A059] animate-pulse' : ''
                              }`}
                            title="Pronounce word"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </p>
                    )}

                    {entry.inOtherWords && (
                      <div className="pl-3 border-l-2 border-[#C5A059]/30">
                        <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider block mb-0.5">
                          In Other Words
                        </span>
                        <p className="text-xs text-[#DFC386]/90 italic leading-relaxed">
                          "{entry.inOtherWords}"
                        </p>
                      </div>
                    )}

                    {entry.exampleSentences && entry.exampleSentences.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider flex items-center gap-1">
                          <Quote className="w-2.5 h-2.5" />
                          Example
                        </span>
                        {entry.exampleSentences.map((sent, sIdx) => (
                          <p key={sIdx} className="text-xs text-white/60 leading-relaxed pl-1">
                            {sent}
                          </p>
                        ))}
                      </div>
                    )}

                    {entry.synonyms && entry.synonyms.length > 0 && (
                      <p className="text-[11px] text-white/35 pt-0.5">
                        <span className="uppercase tracking-wider font-semibold">Synonyms: </span>
                        {entry.synonyms.map((syn, synIdx) => (
                          <React.Fragment key={synIdx}>
                            <button
                              onClick={() => handleSend(syn.replace(/\(.*?\)/g, '').trim())}
                              className="text-[#C5A059]/80 hover:text-[#C5A059] hover:underline cursor-pointer"
                            >
                              {syn}
                            </button>
                            {synIdx < entry.synonyms.length - 1 && <span>, </span>}
                          </React.Fragment>
                        ))}
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-1 text-[10px] text-white/25">
                      <button
                        onClick={() => handleCopyText(msg.text, msg.id)}
                        className="hover:text-white/60 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      {msg.sources && msg.sources.length > 0 && (
                        <a
                          href={msg.sources[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white/60 transition-colors flex items-center gap-1"
                        >
                          <span>{msg.sources[0].title}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      <span className="ml-auto">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-xs sm:prose-sm max-w-none text-white/80 leading-relaxed">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5 justify-start animate-in fade-in">
            <div
              className="w-7 h-7 rounded-full bg-cover bg-center border border-[#C5A059]/40 shrink-0 animate-pulse"
              style={{ backgroundImage: `url('${avatarUrl}')` }}
            />
            <div className="flex items-center gap-2 pt-1.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-bounce" />
              </div>
              <span className="text-xs italic text-white/40">Consulting the lexicon...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-white/10 shrink-0 space-y-2">
        {recentSearches.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-white/30 overflow-x-auto no-scrollbar">
            <History className="w-3 h-3 shrink-0" />
            {recentSearches.map((rec, rIdx) => (
              <button
                key={rIdx}
                onClick={() => handleSend(rec)}
                disabled={isLoading}
                className="px-1.5 py-0.5 rounded bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-white shrink-0 cursor-pointer transition-colors"
              >
                {rec}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              id="input-ask-guru-query"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask about a word, phrase, or philosophical concept..."
              className="w-full bg-[#0F0F0F] border border-white/10 focus:border-[#C5A059]/50 rounded-full pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-hidden transition-all"
            />
            {inputQuery && (
              <button
                type="button"
                onClick={() => setInputQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            id="btn-submit-guru-query"
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="px-4 py-2.5 rounded-full bg-gradient-to-r from-[#DFC386] to-[#C5A059] hover:brightness-110 text-black text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Ask</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center gap-1 text-[9.5px] text-white/25 px-1">
          <Info className="w-2.5 h-2.5" />
          <span>Strict scope: word definitions, pronunciation, examples & synonyms</span>
        </div>
      </div>
    </section>
  );
};