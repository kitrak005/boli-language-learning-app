import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Sparkles, RefreshCw, Lightbulb, Heart } from 'lucide-react';
import { sound } from '../utils/audio';

export type GuruEmotion = 'idle' | 'speaking' | 'happy' | 'encouraging' | 'thinking' | 'namaste';

interface IndianTeacherProps {
  emotion?: GuruEmotion;
  customMessage?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showBubble?: boolean;
  interactive?: boolean;
  traditionId?: string;
  onSpeak?: (text: string) => void;
  className?: string;
}

const GURU_WISDOM_QUOTES = [
  {
    sanskrit: 'अभ्यासात् धार्यते विद्या',
    transliteration: 'Abhyāsāt dhāryate vidyā',
    english: 'Through regular practice, sacred knowledge is retained.',
    audioText: 'अभ्यासात् धार्यते विद्या',
  },
  {
    sanskrit: 'विद्या ददाति विनयम्',
    transliteration: 'Vidyā dadāti vinayam',
    english: 'True knowledge bestows humility and poise.',
    audioText: 'विद्या ददाति विनयम्',
  },
  {
    sanskrit: 'सत्यमेव जयते नानृतम्',
    transliteration: 'Satyameva jayate nānṛtam',
    english: 'Truth alone triumphs, not untruth.',
    audioText: 'सत्यमेव जयते नानृतम्',
  },
  {
    sanskrit: 'वसुधैव कुटुम्बकम्',
    transliteration: 'Vasudhaiva kuṭumbakam',
    english: 'The entire cosmos is one single family.',
    audioText: 'वसुधैव कुटुम्बकम्',
  },
  {
    sanskrit: 'उत्तिष्ठत जाग्रत प्राप्य वरान्निबोधत',
    transliteration: 'Uttiṣṭhata jāgrata prāpya varānnibodhata',
    english: 'Arise, awake, and learn from the wise masters.',
    audioText: 'उत्तिष्ठत जाग्रत',
  },
];

export const IndianTeacher: React.FC<IndianTeacherProps> = ({
  emotion: controlledEmotion,
  customMessage,
  size = 'md',
  showBubble = true,
  interactive = true,
  traditionId = 'sanskrit',
  onSpeak,
  className = '',
}) => {
  const [activeEmotion, setActiveEmotion] = useState<GuruEmotion>(controlledEmotion || 'idle');
  const [isBlinking, setIsBlinking] = useState(false);
  const [isSpeakingLocally, setIsSpeakingLocally] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [bubbleText, setBubbleText] = useState(customMessage || GURU_WISDOM_QUOTES[0].english);
  const [mouthFrame, setMouthFrame] = useState(0);

  // Sync with controlled emotion
  useEffect(() => {
    if (controlledEmotion) {
      setActiveEmotion(controlledEmotion);
    }
  }, [controlledEmotion]);

  // Sync with custom message
  useEffect(() => {
    if (customMessage) {
      setBubbleText(customMessage);
    }
  }, [customMessage]);

  // Global sound state listener for lip sync
  useEffect(() => {
    const unsubscribe = sound.onSpeechStateChange((isSpeaking) => {
      setIsSpeakingLocally(isSpeaking);
      if (isSpeaking) {
        setActiveEmotion('speaking');
      } else {
        setActiveEmotion(controlledEmotion || 'idle');
      }
    });
    return unsubscribe;
  }, [controlledEmotion]);

  // Periodic eye blinking (every 3.5s)
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 3600);
    return () => clearInterval(blinkInterval);
  }, []);

  // Lip-sync mouth animation loop while speaking
  useEffect(() => {
    if (activeEmotion === 'speaking' || isSpeakingLocally) {
      const mouthInterval = setInterval(() => {
        setMouthFrame((prev) => (prev + 1) % 4);
      }, 140);
      return () => clearInterval(mouthInterval);
    } else {
      setMouthFrame(0);
    }
  }, [activeEmotion, isSpeakingLocally]);

  const currentQuote = GURU_WISDOM_QUOTES[quoteIndex];

  const handleNextQuote = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    sound.playTileClick();
    const nextIdx = (quoteIndex + 1) % GURU_WISDOM_QUOTES.length;
    setQuoteIndex(nextIdx);
    setBubbleText(GURU_WISDOM_QUOTES[nextIdx].english);
  };

  const handlePronounceWisdom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    sound.unlockAudio();
    setActiveEmotion('speaking');
    const textToSpeak = customMessage || currentQuote.audioText;
    const phoneticFallback = currentQuote.transliteration;
    if (onSpeak) {
      onSpeak(textToSpeak);
    } else {
      sound.speak(
        textToSpeak,
        traditionId,
        () => setActiveEmotion('speaking'),
        () => setActiveEmotion(controlledEmotion || 'happy'),
        phoneticFallback
      );
    }
  };

  const handleTeacherClick = () => {
    if (!interactive) return;
    sound.unlockAudio();
    sound.playTileClick();
    setActiveEmotion('namaste');
    setTimeout(() => {
      handlePronounceWisdom();
    }, 150);
  };

  // Dimensions based on size prop
  const dimensions = {
    sm: { width: 90, height: 110, scale: 0.8 },
    md: { width: 140, height: 170, scale: 1 },
    lg: { width: 190, height: 230, scale: 1.3 },
    hero: { width: 230, height: 280, scale: 1.55 },
  }[size];

  return (
    <div className={`relative flex items-center gap-4 select-none ${className}`}>
      {/* 2D Animated Indian Guru Character SVG */}
      <motion.div
        id="guru-character-container"
        onClick={handleTeacherClick}
        title="Acharya Vidyasagar (Tap for classical pronunciation & wisdom)"
        className={`relative flex flex-col items-center justify-center shrink-0 ${
          interactive ? 'cursor-pointer group' : ''
        }`}
        animate={{
          y: activeEmotion === 'happy' ? [-4, -14, -4] : [0, -4, 0],
          rotate: activeEmotion === 'thinking' ? [0, 2, 0] : [0, 0, 0],
        }}
        transition={{
          y: {
            duration: activeEmotion === 'happy' ? 0.6 : 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        {/* Divine Aura Glow on Happy/Speaking */}
        <AnimatePresence>
          {(activeEmotion === 'happy' || activeEmotion === 'speaking') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.7, scale: 1.15 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -inset-4 rounded-full bg-gradient-to-tr from-[#C5A059]/20 via-[#E5C158]/30 to-amber-500/10 blur-xl pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Floating Sparkles when Happy */}
        {activeEmotion === 'happy' && (
          <>
            <motion.div
              animate={{ y: [-10, -25], opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute -top-3 -left-2 text-[#C5A059]"
            >
              <Sparkles className="w-5 h-5 fill-[#C5A059]" />
            </motion.div>
            <motion.div
              animate={{ y: [-5, -20], opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
              className="absolute -top-4 right-1 text-[#E5C158]"
            >
              <Sparkles className="w-4 h-4 fill-[#E5C158]" />
            </motion.div>
          </>
        )}

        {/* SVG Vector Graphic for Indian Acharya / Guru */}
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox="0 0 160 190"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl overflow-visible transition-transform duration-200 group-hover:scale-105"
        >
          {/* DEFINITIONS & GRADIENTS */}
          <defs>
            {/* Skin Tone Gradient */}
            <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2A76F" />
              <stop offset="100%" stopColor="#C98850" />
            </linearGradient>

            {/* Saffron Kurta Gradient */}
            <linearGradient id="saffronGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="50%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>

            {/* Gold Border Ribbon */}
            <linearGradient id="goldRibbon" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Dark Hair/Beard Gradient */}
            <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#292524" />
              <stop offset="100%" stopColor="#1C1917" />
            </linearGradient>

            {/* Tilak Gradient */}
            <linearGradient id="tilakGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="50%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
          </defs>

          {/* BACKGROUND HALO / GLOW */}
          <circle cx="80" cy="72" r="50" fill="#C5A059" fillOpacity="0.12" />
          <circle cx="80" cy="72" r="44" stroke="#C5A059" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 3" />

          {/* TOPKNOT (Shikha / Jata Bun) */}
          <g id="topknot">
            <ellipse cx="80" cy="22" rx="15" ry="14" fill="url(#hairGrad)" />
            {/* Gold Hair Tie Band */}
            <rect x="70" y="28" width="20" height="5" rx="2.5" fill="url(#goldRibbon)" />
            {/* Sacred Lotus Bead / Gem on hair */}
            <circle cx="80" cy="22" r="3.5" fill="#F59E0B" />
            <circle cx="80" cy="22" r="1.5" fill="#FEF08A" />
          </g>

          {/* BODY / TORSO & KURTA */}
          <g id="torso">
            {/* Shoulders & Upper Body */}
            <path
              d="M32 145 C32 120, 50 112, 80 112 C110 112, 128 120, 128 145 L132 188 C132 190, 28 190, 28 188 Z"
              fill="#1C1C1E"
              stroke="#2C2C2E"
              strokeWidth="2"
            />

            {/* Kurta Placket & Collar */}
            <path
              d="M72 112 L80 126 L88 112"
              fill="none"
              stroke="#C5A059"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line x1="80" y1="126" x2="80" y2="175" stroke="#C5A059" strokeWidth="2" strokeDasharray="2 3" />

            {/* Saffron Angavastram (Draped Sacred Shawl across chest) */}
            <path
              d="M36 128 C45 132, 60 148, 88 188 L114 188 C82 142, 65 124, 48 118 Z"
              fill="url(#saffronGrad)"
            />
            {/* Gold Zari Border on Shawl */}
            <path
              d="M36 128 C45 132, 60 148, 88 188"
              fill="none"
              stroke="url(#goldRibbon)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Rudraksha Mala (Sacred Beads Necklace) */}
            <g id="mala">
              <path
                d="M60 114 C60 138, 100 138, 100 114"
                fill="none"
                stroke="#78350F"
                strokeWidth="4"
                strokeDasharray="2 4"
                strokeLinecap="round"
              />
              <circle cx="80" cy="133" r="4" fill="#B45309" stroke="#FDE68A" strokeWidth="1" />
            </g>
          </g>

          {/* HEAD & HAIR */}
          <g id="head">
            {/* Back Hair */}
            <path
              d="M48 55 C44 75, 46 95, 52 104 C62 108, 98 108, 108 104 C114 95, 116 75, 112 55 C105 32, 55 32, 48 55 Z"
              fill="url(#hairGrad)"
            />

            {/* Ears */}
            <circle cx="48" cy="72" r="7" fill="url(#skinGrad)" />
            <circle cx="112" cy="72" r="7" fill="url(#skinGrad)" />
            {/* Gold Kundala (Earrings) */}
            <circle cx="47" cy="76" r="2.5" fill="#F59E0B" />
            <circle cx="113" cy="76" r="2.5" fill="#F59E0B" />

            {/* Face Oval */}
            <path
              d="M52 62 C52 42, 108 42, 108 62 C108 85, 96 102, 80 102 C64 102, 52 85, 52 62 Z"
              fill="url(#skinGrad)"
            />

            {/* SACRED TILAK & CHANDAN */}
            <g id="tilak">
              {/* Chandan U-Shape / Urdhva Pundra */}
              <path
                d="M74 46 C74 58, 86 58, 86 46"
                fill="none"
                stroke="#FEF3C7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Center Red Kumkum Line & Bindi */}
              <line x1="80" y1="44" x2="80" y2="56" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
              <circle cx="80" cy="58" r="1.5" fill="#DC2626" />
            </g>

            {/* EYEBROWS */}
            <motion.g
              animate={{
                y: activeEmotion === 'speaking' ? [-1, 1, -1] : activeEmotion === 'thinking' ? -2 : 0,
              }}
              transition={{ duration: 0.4, repeat: activeEmotion === 'speaking' ? Infinity : 0 }}
            >
              {/* Left Eyebrow */}
              <path
                d={
                  activeEmotion === 'thinking'
                    ? 'M58 59 Q66 54 73 59'
                    : activeEmotion === 'happy'
                    ? 'M58 57 Q66 52 73 58'
                    : 'M59 60 Q66 56 73 60'
                }
                fill="none"
                stroke="#292524"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Right Eyebrow */}
              <path
                d={
                  activeEmotion === 'thinking'
                    ? 'M87 59 Q94 56 102 60'
                    : activeEmotion === 'happy'
                    ? 'M87 58 Q94 52 102 57'
                    : 'M87 60 Q94 56 101 60'
                }
                fill="none"
                stroke="#292524"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </motion.g>

            {/* EYES */}
            <g id="eyes">
              {isBlinking ? (
                // Closed Blinking Lids
                <>
                  <path d="M60 68 Q66 72 72 68" stroke="#3E2723" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <path d="M88 68 Q94 72 100 68" stroke="#3E2723" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                </>
              ) : activeEmotion === 'happy' ? (
                // Smiling Crescent Eyes
                <>
                  <path d="M60 69 Q66 64 72 69" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <path d="M88 69 Q94 64 100 69" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" fill="none" />
                </>
              ) : (
                // Open Expressive Eyes with Highlights
                <>
                  {/* Left Eye */}
                  <ellipse cx="66" cy="67" rx="5" ry="6" fill="#FFFFFF" />
                  <ellipse cx="66.5" cy="67" rx="3.2" ry="4" fill="#3E2723" />
                  <circle cx="68" cy="65.5" r="1.3" fill="#FFFFFF" />

                  {/* Right Eye */}
                  <ellipse cx="94" cy="67" rx="5" ry="6" fill="#FFFFFF" />
                  <ellipse cx="94.5" cy="67" rx="3.2" ry="4" fill="#3E2723" />
                  <circle cx="96" cy="65.5" r="1.3" fill="#FFFFFF" />
                </>
              )}
            </g>

            {/* NOSE */}
            <path d="M80 64 L78 75 Q80 77 82 75" fill="none" stroke="#A86B3E" strokeWidth="2" strokeLinecap="round" />

            {/* MOUSTACHE & BEARD */}
            <g id="beard-moustache">
              {/* Moustache */}
              <path
                d="M66 82 Q74 80 80 84 Q86 80 94 82 Q87 86 80 85 Q73 86 66 82 Z"
                fill="url(#hairGrad)"
              />

              {/* Neat Beard */}
              <path
                d="M62 82 C62 98, 70 106, 80 106 C90 106, 98 98, 98 82 C94 92, 88 95, 80 95 C72 95, 66 92, 62 82 Z"
                fill="url(#hairGrad)"
              />
            </g>

            {/* ANIMATED MOUTH */}
            <g id="mouth">
              {activeEmotion === 'speaking' || isSpeakingLocally ? (
                mouthFrame === 0 ? (
                  // Open phonetic 'A' shape
                  <ellipse cx="80" cy="88" rx="4.5" ry="5.5" fill="#7F1D1D" stroke="#450A0A" strokeWidth="1">
                    <ellipse cx="80" cy="86" rx="3" ry="1.5" fill="#FFFFFF" />
                  </ellipse>
                ) : mouthFrame === 1 ? (
                  // Round 'O' / 'U' shape
                  <circle cx="80" cy="88" r="4" fill="#7F1D1D" stroke="#450A0A" strokeWidth="1" />
                ) : mouthFrame === 2 ? (
                  // Wide smile talking 'E' / 'I'
                  <path d="M74 86 Q80 92 86 86" stroke="#7F1D1D" strokeWidth="3" strokeLinecap="round" fill="none" />
                ) : (
                  // Half-open vowel
                  <ellipse cx="80" cy="87.5" rx="3.5" ry="3.5" fill="#7F1D1D" />
                )
              ) : activeEmotion === 'happy' ? (
                // Big beaming smile
                <path
                  d="M73 85 Q80 93 87 85"
                  fill="#7F1D1D"
                  stroke="#450A0A"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                // Calm serene smile
                <path d="M74 86 Q80 90 86 86" stroke="#5C1D1D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              )}
            </g>
          </g>

          {/* ARMS & GESTURES */}
          <g id="hands-gestures">
            {activeEmotion === 'namaste' ? (
              // Joined Anjali Mudra (Namaste)
              <g id="namaste-hands">
                <path
                  d="M72 136 C72 122, 80 116, 80 116 C80 116, 88 122, 88 136 L84 148 L76 148 Z"
                  fill="url(#skinGrad)"
                  stroke="#A86B3E"
                  strokeWidth="1.5"
                />
                {/* Palms joined outline */}
                <line x1="80" y1="116" x2="80" y2="148" stroke="#A86B3E" strokeWidth="1.5" />
                {/* Gold bangle on wrist */}
                <rect x="74" y="146" width="12" height="3" rx="1.5" fill="url(#goldRibbon)" />
              </g>
            ) : activeEmotion === 'happy' ? (
              // Cheering Raised Hands
              <g id="celebrate-hands">
                {/* Left hand waving */}
                <motion.g
                  animate={{ rotate: [-8, 8, -8] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ transformOrigin: '35px 135px' }}
                >
                  <path d="M36 135 L22 112 Q20 106 26 104 L34 115" stroke="url(#skinGrad)" strokeWidth="8" strokeLinecap="round" />
                  <circle cx="23" cy="106" r="6" fill="url(#skinGrad)" />
                </motion.g>

                {/* Right hand waving */}
                <motion.g
                  animate={{ rotate: [8, -8, 8] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ transformOrigin: '125px 135px' }}
                >
                  <path d="M124 135 L138 112 Q140 106 134 104 L126 115" stroke="url(#skinGrad)" strokeWidth="8" strokeLinecap="round" />
                  <circle cx="137" cy="106" r="6" fill="url(#skinGrad)" />
                </motion.g>
              </g>
            ) : activeEmotion === 'thinking' ? (
              // Hand touching chin
              <g id="thinking-hand">
                <path d="M118 145 C115 130, 95 105, 88 98" stroke="url(#skinGrad)" strokeWidth="7" strokeLinecap="round" />
                <circle cx="87" cy="97" r="5" fill="url(#skinGrad)" />
              </g>
            ) : (
              // Default Chin Mudra (Teaching Wisdom gesture on right hand) & Palm-leaf Grantha Manuscript on left
              <g id="default-gestures">
                {/* Left Hand holding Palm-Leaf Manuscript (Tala-Patra) */}
                <g id="manuscript">
                  {/* Palm leaf strips */}
                  <rect x="22" y="142" width="34" height="12" rx="2" fill="#D4B996" stroke="#8C6D46" strokeWidth="1" transform="rotate(-12 22 142)" />
                  <rect x="23" y="145" width="34" height="12" rx="2" fill="#E8D5BC" stroke="#8C6D46" strokeWidth="1" transform="rotate(-8 23 145)" />
                  {/* Sacred red thread binding */}
                  <line x1="38" y1="138" x2="38" y2="158" stroke="#DC2626" strokeWidth="2" />
                  {/* Hand holding scroll */}
                  <circle cx="38" cy="148" r="6" fill="url(#skinGrad)" />
                </g>

                {/* Right Hand: Chin Mudra / Vyakhyana Teaching Gesture */}
                <motion.g
                  animate={{
                    y: activeEmotion === 'speaking' ? [-2, 3, -2] : [0, -1, 0],
                    rotate: activeEmotion === 'speaking' ? [-4, 4, -4] : 0,
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ transformOrigin: '120px 145px' }}
                >
                  <path d="M118 148 L126 132 C128 126, 122 122, 118 126 L112 136" stroke="url(#skinGrad)" strokeWidth="6" strokeLinecap="round" />
                  {/* Mudra Ring (Thumb touching index finger) */}
                  <circle cx="118" cy="125" r="4.5" fill="none" stroke="url(#skinGrad)" strokeWidth="4" />
                  {/* Extended three fingers (Sat, Chit, Ananda) */}
                  <line x1="120" y1="122" x2="124" y2="116" stroke="url(#skinGrad)" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="122" y1="124" x2="128" y2="118" stroke="url(#skinGrad)" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="124" y1="126" x2="130" y2="121" stroke="url(#skinGrad)" strokeWidth="2" strokeLinecap="round" />
                  {/* Gold bangle */}
                  <rect x="114" y="142" width="10" height="3" rx="1.5" fill="url(#goldRibbon)" />
                </motion.g>
              </g>
            )}
          </g>
        </svg>

        {/* Mascot Name Badge */}
        <div className="mt-1 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/70 border border-[#C5A059]/40 backdrop-blur-sm shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse" />
          <span className="text-[10px] uppercase font-serif tracking-[0.18em] text-[#C5A059]">
            Guru Vidyadhar
          </span>
        </div>
      </motion.div>

      {/* Interactive Speech Bubble */}
      {showBubble && (
        <motion.div
          id="guru-speech-bubble"
          initial={{ opacity: 0, scale: 0.95, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="flex-1 relative bg-gradient-to-br from-[#181715] to-[#100F0E] border border-[#C5A059]/35 rounded-2xl p-4 sm:p-5 shadow-2xl text-left min-w-[200px]"
        >
          {/* Bubble Tail pointing left */}
          <div className="absolute -left-2.5 top-6 w-4 h-4 bg-[#181715] border-l border-b border-[#C5A059]/35 rotate-45" />

          {/* Header with Title & Audio Pronunciation Button */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="text-[10px] uppercase font-semibold tracking-[0.2em] text-[#C5A059]">
                Classical Teacher's Guidance
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Voice Pronounce Button */}
              <button
                id="btn-guru-voice"
                onClick={handlePronounceWisdom}
                title="Hear Pronunciation from Guru"
                className={`p-1.5 rounded-lg bg-white/5 hover:bg-[#C5A059]/20 text-[#C5A059] border border-white/10 hover:border-[#C5A059]/40 transition-all cursor-pointer ${
                  isSpeakingLocally ? 'ring-2 ring-[#C5A059] scale-110' : ''
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>

              {/* Cycle Quote / Next Tip */}
              {!customMessage && (
                <button
                  id="btn-guru-next-tip"
                  onClick={handleNextQuote}
                  title="Next Classical Wisdom Quote"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Script Quote / Sanskrit Line */}
          {!customMessage && (
            <div className="mb-2">
              <p className="font-serif text-base sm:text-lg text-[#C5A059] font-normal leading-snug">
                {currentQuote.sanskrit}
              </p>
              <p className="text-[11px] font-mono text-white/50 tracking-wider">
                {currentQuote.transliteration}
              </p>
            </div>
          )}

          {/* English Meaning / Dynamic Instruction */}
          <p className="text-xs sm:text-sm text-white/90 font-light leading-relaxed">
            "{bubbleText}"
          </p>
        </motion.div>
      )}
    </div>
  );
};
