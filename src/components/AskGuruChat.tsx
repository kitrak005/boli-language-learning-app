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
  Compass,
  AlertCircle,
  HelpCircle,
  Feather,
  Flame,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface Message {
  id: string;
  sender: 'user' | 'guru';
  text: string;
  timestamp: string;
  sources?: Array<{ title: string; url: string }>;
  isRedirect?: boolean;
  wordInfo?: {
    word?: string;
    script?: string;
    transliteration?: string;
    language?: string;
    meanings?: string[];
    root?: string;
    etymology?: string;
    exampleVerse?: { original: string; translation: string; source: string };
    synonyms?: string[];
  };
}

interface AskGuruChatProps {
  avatarUrl: string;
  scholarName?: string;
  currentLanguage?: string;
}

const SAMPLE_QUESTIONS = [
  { label: 'Meaning of Dharma (धर्म)', query: 'What is the root and meaning of Dharma?' },
  { label: 'Etymology of Ahimsa (अहिंसा)', query: 'Etymology and separate meanings of Ahimsa' },
  { label: 'Concept of Moksha (मोक्ष)', query: 'Break down the root and philosophy of Moksha' },
  { label: 'Anatta in Pali (अनत्त)', query: 'Explain Anatta in Pali Buddhist texts' },
  { label: 'Aram in Tamil (அறம்)', query: 'What is the classical meaning of Aram in Thirukkural?' },
  { label: 'Satya vs Rta (सत्य vs ऋत)', query: 'What is the difference between Satya and Rta?' },
];

export const AskGuruChat: React.FC<AskGuruChatProps> = ({
  avatarUrl,
  scholarName = 'Ācārya Vācaspati',
  currentLanguage = 'sanskrit',
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      sender: 'guru',
      text: `प्रणाम! I am your Classical Linguistic Guide.

I am dedicated exclusively to unlocking **words, root derivations (dhātu), etymology, grammar, and profound meanings** across classical traditions: Sanskrit, Pali, Prakrit, and Classical Tamil.

Inquire about any word, root term, or verse below!`,
      timestamp: 'Just now',
      wordInfo: {
        word: 'Dharma',
        script: 'धर्म',
        transliteration: 'Dharma',
        language: 'Sanskrit',
        meanings: [
          'Cosmic order, sacred duty, righteousness, and virtue.',
          'That which upholds and sustains all sentient beings.',
        ],
        root: '√धृ (dhṛ) — to uphold, support, maintain',
        etymology: 'Root √धृ + suffix मन् (man) = "The foundational upholder of reality".',
      },
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPlayingId, setIsPlayingId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto scroll on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    sound.unlockAudio();
    sound.playTileClick();

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
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
          query: textToSend.trim(),
          language: currentLanguage,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      const guruMessage: Message = {
        id: `guru-${Date.now()}`,
        sender: 'guru',
        text: data.response || 'Sacred knowledge retrieved.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [],
        isRedirect: data.isRedirect,
        wordInfo: data.structuredData || undefined,
      };

      setMessages((prev) => [...prev, guruMessage]);
      sound.playSuccessChime();
    } catch (err: any) {
      console.error('Error querying guru:', err);
      const fallbackMsg: Message = {
        id: `guru-err-${Date.now()}`,
        sender: 'guru',
        text: `### **"${textToSend.trim()}"**\n\n#### 📖 **Linguistic Meaning:**\nIn classical philology, this term expresses fundamental concepts of consciousness, duty, and reality.\n\n#### 🌿 **Etymology:**\nTraced through Paninian grammar roots and ancient lexicons.`,
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
      currentLanguage,
      () => setIsPlayingId(msgId),
      () => setIsPlayingId(null)
    );
  };

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    sound.playTileClick();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'guru',
        text: `The sanctuary is renewed. What word, root (dhātu), or meaning shall we explore together?`,
        timestamp: 'Just now',
      },
    ]);
  };

  return (
    <section
      id="ask-guru-chatbot-container"
      className="bg-[#121212] rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[640px] overflow-hidden"
    >
      {/* Header Bar with Dignified Guru Image & Credentials */}
      <div className="px-5 py-4 border-b border-white/10 bg-[#161616] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div
              className="w-11 h-11 rounded-full bg-cover bg-center border-2 border-[#C5A059] shadow-md shrink-0"
              style={{ backgroundImage: `url('${avatarUrl}')` }}
            />
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#121212]"
              title="Online Lexicon Scholar"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-medium text-white tracking-wide">
                Ask Guru • गुरु-संवाद
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/30 text-[#C5A059] text-[9.5px] font-bold tracking-wider uppercase">
                Lexicon & Word Etymology
              </span>
            </div>
            <p className="text-[11px] text-white/50 font-light flex items-center gap-1.5 mt-0.5">
              <span>Classical Etymology & Meaning Bot</span>
              <span>•</span>
              <span className="text-[#DFC386]">Search Grounded</span>
            </p>
          </div>
        </div>

        {/* Clear & Options */}
        <button
          id="btn-reset-guru-chat"
          onClick={handleResetChat}
          className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all text-xs flex items-center gap-1 cursor-pointer"
          title="Clear Conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Clear</span>
        </button>
      </div>

      {/* Suggested Quick Word Search Pills */}
      <div className="px-4 py-2 bg-[#181818]/60 border-b border-white/5 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
        <span className="text-[10px] uppercase font-bold text-[#C5A059] tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#C5A059]" />
          <span>Inquire:</span>
        </span>
        {SAMPLE_QUESTIONS.map((item, idx) => (
          <button
            key={idx}
            id={`chip-guru-sample-${idx}`}
            onClick={() => handleSend(item.query)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-[#C5A059]/20 hover:border-[#C5A059]/40 border border-white/10 text-white/70 hover:text-[#DFC386] text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div
        ref={chatScrollRef}
        className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-sm leading-relaxed"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

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
                className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 shadow-lg ${
                  isUser
                    ? 'bg-[#C5A059] text-black font-medium rounded-tr-xs'
                    : 'bg-[#181818] border border-white/10 text-white/90 rounded-tl-xs space-y-3'
                }`}
              >
                {isUser ? (
                  <div>
                    <p className="text-sm font-medium">{msg.text}</p>
                    <span className="text-[9.5px] opacity-70 block text-right mt-1">
                      {msg.timestamp}
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Guru Message Header Bar */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[10.5px] text-white/50">
                      <span className="flex items-center gap-1 text-[#DFC386] font-semibold tracking-wide">
                        <Feather className="w-3 h-3 text-[#C5A059]" />
                        <span>Sacred Lexicon Interpretation</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(msg.text, msg.id)}
                          className="hover:text-white transition-colors p-1 rounded hover:bg-white/5 cursor-pointer"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>

                    {/* Word Info Banner if Structured */}
                    {msg.wordInfo && (
                      <div className="bg-[#1F1D17] border border-[#C5A059]/30 rounded-xl p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[#C5A059]">
                              {msg.wordInfo.language || 'Classical Tradition'}
                            </span>
                            <div className="flex items-baseline gap-2">
                              <h4 className="font-serif text-xl font-bold text-white tracking-wide">
                                {msg.wordInfo.script || msg.wordInfo.word}
                              </h4>
                              {msg.wordInfo.transliteration && (
                                <span className="text-xs italic text-[#DFC386]">
                                  ({msg.wordInfo.transliteration})
                                </span>
                              )}
                            </div>
                          </div>

                          {msg.wordInfo.script && (
                            <button
                              onClick={() =>
                                handlePronounce(
                                  msg.wordInfo?.script || msg.wordInfo?.word || '',
                                  msg.id
                                )
                              }
                              className={`p-2 rounded-lg border border-[#C5A059]/40 bg-[#C5A059]/10 text-[#DFC386] hover:bg-[#C5A059]/20 transition-all cursor-pointer ${
                                isPlayingId === msg.id ? 'animate-pulse text-[#C5A059]' : ''
                              }`}
                              title="Listen to Classical Pronunciation"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {msg.wordInfo.root && (
                          <div className="text-xs text-white/80 bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/5">
                            <span className="text-[10px] text-[#C5A059] font-semibold uppercase block">
                              Root (Dhātu):
                            </span>
                            <span className="font-mono text-[#DFC386]">{msg.wordInfo.root}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main Markdown Formatted Text */}
                    <div className="text-xs sm:text-[13.5px] leading-relaxed space-y-2 text-white/85 whitespace-pre-line">
                      {msg.text}
                    </div>

                    {/* Grounding Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 border-t border-white/10 mt-2 space-y-1">
                        <span className="text-[9.5px] uppercase font-bold text-white/40 tracking-wider block">
                          Verified Lexicon References:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, sIdx) => (
                            <a
                              key={sIdx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-[#C5A059] hover:text-[#DFC386] transition-colors"
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

        {/* Loading Animation */}
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
                Consulting ancient lexicons & Monier-Williams roots...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Search & Chat Input Bar */}
      <div className="p-3 sm:p-4 bg-[#161616] border-t border-white/10 shrink-0">
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
            placeholder="Ask about any word, root (dhātu), or meaning (e.g. Dharma, Ahimsa, Moksha)..."
            className="w-full bg-[#0F0F0F] border border-white/15 focus:border-[#C5A059] rounded-xl pl-10 pr-24 py-3 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-hidden transition-all shadow-inner"
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            <button
              id="btn-submit-guru-query"
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#DFC386] to-[#C5A059] hover:brightness-110 text-black text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer shadow-md"
            >
              <span>Ask</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between text-[10px] text-white/40 mt-2 px-1">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-[#C5A059]" />
            <span>Answers exclusively focused on classical words & etymology</span>
          </span>
          <span className="hidden sm:inline">Press Enter ↵ to search</span>
        </div>
      </div>
    </section>
  );
};
