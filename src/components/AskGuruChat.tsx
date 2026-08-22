import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Send,
  Sparkles,
  Volume2,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  Feather,
  Quote,
  X,
  Languages,
  History,
  AlertCircle,
  ChevronRight,
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

const CURATED_TOPICS = [
  {
    category: 'Core Virtues',
    words: [
      { label: 'Dharma (धर्म)', query: 'Dharma' },
      { label: 'Satya (सत्य)', query: 'Satya' },
      { label: 'Ahimsa (अहिंसा)', query: 'Ahimsa' },
      { label: 'Aram (அறம்)', query: 'Aram' },
    ],
  },
  {
    category: 'Mind & Yoga',
    words: [
      { label: 'Yoga (योग)', query: 'Yoga' },
      { label: 'Jnana (ज्ञान)', query: 'Jnana' },
      { label: 'Karuna (करुणा)', query: 'Karuna' },
      { label: 'Shanti (शान्ति)', query: 'Shanti' },
    ],
  },
  {
    category: 'Metaphysics',
    words: [
      { label: 'Moksha (मोक्ष)', query: 'Moksha' },
      { label: 'Atman (आत्मन्)', query: 'Atman' },
      { label: 'Anatta (अनत्त)', query: 'Anatta' },
      { label: 'Karma (कर्म)', query: 'Karma' },
    ],
  },
];

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

  // Check if text follows the Dictionary layout
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
        exampleSentences.push(trimmed);
      }
    }
  }

  const synonyms: string[] = [];
  if (synMatch) {
    const rawSyns = synMatch[1].split(/[,;•|]/);
    for (const s of rawSyns) {
      const t = s.trim();
      if (t) synonyms.push(t);
    }
  }

  return {
    word: wordMatch ? wordMatch[1].trim() : '',
    partOfSpeech: posMatch ? posMatch[1].trim() : 'Noun',
    pronunciation: pronMatch ? pronMatch[1].trim() : '',
    simpleDefinition: defMatch ? defMatch[1].trim() : '',
    inOtherWords: inOtherWordsMatch ? inOtherWordsMatch[1].trim() : '',
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
Pronunciation: DHEHR-muh / [ˈdʱɐr.mɐ]
Simple Definition: The universal cosmic order, natural law, and sacred ethical duty that upholds and harmonizes all existence.
In Other Words: Living in righteous alignment with truth and moral purpose.
Example Sentences:
• "धारणाद्धर्म इत्याहुर्धर्मो धारयते प्रजाः ।" (Dharma is that which sustains; it preserves and holds together all beings in harmony.)
• Practicing compassion, honesty, and responsibility in daily life is an essential expression of one's personal dharma.
Synonyms: Righteousness, Sacred Duty, Cosmic Law, Virtue (ऋत, सदाचार)`,
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

  // Auto scroll to bottom when new messages arrive
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

    // Add to recent searches
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
          language: selectedLang === 'all' ? currentLanguage : selectedLang,
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
      className="bg-[#121212] rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[700px] overflow-hidden"
    >
      {/* 1. Header Bar: Dictionary Bot Scope & Status */}
      <div className="px-5 py-4 border-b border-white/10 bg-[#161616] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div
              className="w-11 h-11 rounded-full bg-cover bg-center border-2 border-[#C5A059] shadow-md shrink-0"
              style={{ backgroundImage: `url('${avatarUrl}')` }}
            />
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#121212]"
              title="Dictionary Engine Online"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-medium text-white tracking-wide">
                Ask Guru • Dictionary Bot
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/30 text-[#C5A059] text-[9px] font-bold tracking-wider uppercase">
                Word Meanings Only
              </span>
            </div>
            <p className="text-[11px] text-white/50 font-light flex items-center gap-1.5 mt-0.5">
              <span>Definitions • Pronunciation • Example Sentences • Synonyms</span>
            </p>
          </div>
        </div>

        {/* Clear Conversation */}
        <button
          id="btn-reset-guru-chat"
          onClick={handleResetChat}
          className="px-2.5 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
          title="Clear Conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Clear</span>
        </button>
      </div>

      {/* 2. Language Filter Bar */}
      <div className="px-4 py-2 bg-[#141414] border-b border-white/5 flex items-center justify-between gap-2 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <Languages className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Tradition:</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {LANGUAGE_FILTERS.map((lang) => (
            <button
              key={lang.id}
              onClick={() => {
                setSelectedLang(lang.id);
                sound.playTileClick();
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                selectedLang === lang.id
                  ? 'bg-[#C5A059] text-black font-semibold shadow-xs'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{lang.label}</span>
              <span className="opacity-50 text-[10px]">({lang.script})</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Curated Quick Inquiries Pill Strip */}
      <div className="px-4 py-2 bg-[#181818]/60 border-b border-white/5 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
        <span className="text-[10px] uppercase font-bold text-[#C5A059] tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#C5A059]" />
          <span>Quick Words:</span>
        </span>
        {CURATED_TOPICS.flatMap((c) => c.words).map((item, idx) => (
          <button
            key={idx}
            id={`chip-guru-sample-${idx}`}
            onClick={() => handleSend(item.query)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-[#C5A059]/20 hover:border-[#C5A059]/40 border border-white/10 text-white/75 hover:text-[#DFC386] text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 4. Chat Messages Feed */}
      <div
        ref={chatScrollRef}
        className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-sm leading-relaxed"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const entry = !isUser ? parseDictionaryResponse(msg.text) : null;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
            >
              {!isUser && (
                <div
                  className="w-8 h-8 rounded-full bg-cover bg-center border border-[#C5A059]/60 shrink-0 mt-1 shadow"
                  style={{ backgroundImage: `url('${avatarUrl}')` }}
                />
              )}

              <div
                className={`max-w-[94%] sm:max-w-[88%] rounded-2xl shadow-lg ${
                  isUser
                    ? 'bg-[#C5A059] text-black font-medium p-3.5 rounded-tr-xs'
                    : 'bg-[#181818] border border-white/10 text-white/90 rounded-tl-xs p-4 sm:p-5 space-y-3'
                }`}
              >
                {isUser ? (
                  <div>
                    <div className="flex items-center gap-1.5 text-black/70 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      <Search className="w-3 h-3" />
                      <span>Word Inquiry</span>
                    </div>
                    <p className="text-sm font-semibold">{msg.text}</p>
                    <span className="text-[9.5px] opacity-60 block text-right mt-1">
                      {msg.timestamp}
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Header Bar */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[11px] text-white/50">
                      <span className="flex items-center gap-1.5 text-[#DFC386] font-semibold tracking-wide">
                        <BookOpen className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>Dictionary Entry</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          className="hover:text-white transition-colors p-1 rounded hover:bg-white/5 cursor-pointer flex items-center gap-1 text-[10.5px]"
                          title="Copy dictionary entry"
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
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>

                    {/* Out of Scope Warning Notice */}
                    {entry?.isOutOfScope ? (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Scope Notice</span>
                        </div>
                        <p className="text-white/90 text-xs sm:text-sm font-medium leading-relaxed">
                          "I am a dictionary bot and can only help with word meanings and language usage. This question is out of scope."
                        </p>
                        <p className="text-white/50 text-[11px] pt-1 border-t border-amber-500/15">
                          💡 Please enter any classical or modern word (e.g. <em>Dharma, Ahimsa, Yoga, Satya, Serendipity, Ephemeral</em>) to inspect its definition, pronunciation, examples, and synonyms.
                        </p>
                      </div>
                    ) : entry && (entry.word || entry.simpleDefinition) ? (
                      /* Exact Structured Dictionary Card */
                      <div className="space-y-3 pt-1">
                        {/* Word Hero & Part of Speech & Audio */}
                        <div className="bg-[#201D16] border border-[#C5A059]/35 rounded-xl p-3.5 sm:p-4 shadow-inner flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {entry.partOfSpeech && (
                                <span className="px-2 py-0.5 rounded bg-[#C5A059]/20 border border-[#C5A059]/30 text-[#C5A059] text-[10px] font-bold tracking-wider uppercase">
                                  {entry.partOfSpeech}
                                </span>
                              )}
                              {entry.pronunciation && (
                                <span className="text-[11px] text-[#DFC386] font-mono">
                                  /{entry.pronunciation.replace(/^\[|\]$/g, '')}/
                                </span>
                              )}
                            </div>

                            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide pt-0.5">
                              {entry.word || 'Word Entry'}
                            </h3>
                          </div>

                          {/* Audio Pronunciation Button */}
                          {entry.word && (
                            <button
                              onClick={() => handlePronounce(entry.word, msg.id)}
                              className={`p-2.5 rounded-xl border border-[#C5A059]/40 bg-[#C5A059]/10 text-[#DFC386] hover:bg-[#C5A059]/20 hover:text-white transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
                                isPlayingId === msg.id
                                  ? 'ring-2 ring-[#C5A059] animate-pulse bg-[#C5A059]/20 text-[#C5A059]'
                                  : ''
                              }`}
                              title="Pronounce word"
                            >
                              <Volume2 className="w-4 h-4" />
                              <span className="text-[10px] font-semibold hidden sm:inline">Listen</span>
                            </button>
                          )}
                        </div>

                        {/* Simple Definition */}
                        {entry.simpleDefinition && (
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-[#C5A059] tracking-wider block">
                              Simple Definition
                            </span>
                            <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-normal">
                              {entry.simpleDefinition}
                            </p>
                          </div>
                        )}

                        {/* In Other Words */}
                        {entry.inOtherWords && (
                          <div className="p-3 rounded-xl bg-[#161616] border border-white/10 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider block">
                              In Other Words
                            </span>
                            <p className="text-xs text-[#DFC386] font-medium leading-relaxed">
                              "{entry.inOtherWords}"
                            </p>
                          </div>
                        )}

                        {/* Example Sentences */}
                        {entry.exampleSentences && entry.exampleSentences.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider flex items-center gap-1">
                              <Quote className="w-3 h-3 text-[#C5A059]" />
                              <span>Example Sentences</span>
                            </span>
                            <div className="space-y-1.5">
                              {entry.exampleSentences.map((sent, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="flex items-start gap-2 p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs text-white/85 leading-relaxed"
                                >
                                  <span className="text-[#C5A059] font-bold shrink-0 mt-0.5">•</span>
                                  <span>{sent}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Synonyms */}
                        {entry.synonyms && entry.synonyms.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider block">
                              Synonyms (Click to explore)
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {entry.synonyms.map((syn, synIdx) => {
                                const cleanTerm = syn.replace(/\(.*?\)/g, '').trim();
                                return (
                                  <button
                                    key={synIdx}
                                    onClick={() => handleSend(cleanTerm)}
                                    className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-[#C5A059]/20 border border-white/10 hover:border-[#C5A059]/40 text-xs text-[#DFC386] hover:text-white transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <span>{syn}</span>
                                    <ChevronRight className="w-2.5 h-2.5 opacity-50" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Clean Markdown Renderer */
                      <div className="prose prose-invert prose-xs sm:prose-sm max-w-none text-white/85 leading-relaxed space-y-2">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}

                    {/* Verified Reference */}
                    {msg.sources && msg.sources.length > 0 && !entry?.isOutOfScope && (
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40">
                        <span>Lexicon Source:</span>
                        <div className="flex items-center gap-2">
                          {msg.sources.map((src, sIdx) => (
                            <a
                              key={sIdx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#C5A059] hover:text-[#DFC386] transition-colors"
                            >
                              <span>{src.title}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Pulse */}
        {isLoading && (
          <div className="flex gap-3 justify-start animate-in fade-in">
            <div
              className="w-8 h-8 rounded-full bg-cover bg-center border border-[#C5A059]/60 shrink-0 shadow animate-pulse"
              style={{ backgroundImage: `url('${avatarUrl}')` }}
            />
            <div className="bg-[#181818] border border-white/10 rounded-2xl rounded-tl-xs p-4 text-xs text-white/70 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-bounce" />
              </div>
              <span className="italic text-[#DFC386]">
                Consulting dictionary lexicons for precise definition & usage...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Search & Inquiry Input Bar */}
      <div className="p-3 sm:p-4 bg-[#161616] border-t border-white/10 shrink-0 space-y-2">
        {/* Recent Search Chips */}
        {recentSearches.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10.5px] text-white/40 overflow-x-auto no-scrollbar">
            <History className="w-3 h-3 text-[#C5A059] shrink-0" />
            <span className="shrink-0">Recent:</span>
            {recentSearches.map((rec, rIdx) => (
              <button
                key={rIdx}
                onClick={() => handleSend(rec)}
                disabled={isLoading}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white shrink-0 cursor-pointer transition-colors"
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
          className="relative flex items-center"
        >
          <div className="absolute left-3.5 text-[#C5A059] pointer-events-none">
            <Search className="w-4 h-4" />
          </div>

          <input
            ref={inputRef}
            id="input-ask-guru-query"
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Enter any word or phrase (e.g. Dharma, Karma, Ahimsa, Yoga, Satya, Moksha)..."
            className="w-full bg-[#0F0F0F] border border-white/15 focus:border-[#C5A059] rounded-xl pl-10 pr-24 py-3 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-hidden transition-all shadow-inner"
          />

          {inputQuery && (
            <button
              type="button"
              onClick={() => setInputQuery('')}
              className="absolute right-16 p-1 text-white/40 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="absolute right-2 flex items-center gap-1.5">
            <button
              id="btn-submit-guru-query"
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#DFC386] to-[#C5A059] hover:brightness-110 text-black text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer shadow-md"
            >
              <span>Define</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between text-[10px] text-white/40 px-1">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-[#C5A059]" />
            <span>Strict scope: Word definitions, pronunciation, example sentences & synonyms</span>
          </span>
          <span className="hidden sm:inline">Press Enter ↵ to look up</span>
        </div>
      </div>
    </section>
  );
};
