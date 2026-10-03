import { useState } from 'react';
import { X, Copy, Check, Gift, MessageCircle, Share2 } from 'lucide-react';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
}

export function InviteFriendsModal({ isOpen, onClose, currentUserId }: InviteFriendsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Carries a ?ref= query param so you can attribute signups to the
  // inviter later if you add that tracking — unused by the app for now.
  const inviteLink = `${window.location.origin}${currentUserId ? `?ref=${currentUserId}` : ''}`;
  const shareMessage = "I'm learning Sanskrit, Pali & Tamil on Bolvani — come join me!";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail on non-HTTPS/local contexts — silently ignore,
      // the link is still visible and selectable for manual copy.
    }
  };

  const openShare = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-[#121212] rounded-2xl border border-white/15 shadow-2xl p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center mx-auto mb-4">
          <Gift className="w-7 h-7 text-[#C5A059]" />
        </div>

        <h3 className="font-serif text-xl font-normal text-white mb-1.5">Invite Friends</h3>
        <p className="text-xs text-white/50 mb-5 leading-relaxed">
          Tell your friends it's free to learn a classical language on Bolvani.
        </p>

        <div className="flex items-center gap-2 bg-[#0A0A0A] border border-white/10 rounded-full pl-4 pr-1.5 py-1.5 mb-4">
          <span className="flex-1 text-xs text-white/70 truncate text-left">{inviteLink}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#C5A059] text-[#121212] text-[11px] font-bold shrink-0"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <p className="text-[10px] uppercase tracking-wider text-white/30 mb-3">Or share via...</p>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() =>
              openShare(`https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${inviteLink}`)}`)
            }
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#C5A059]/40 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-white/70" />
            <span className="text-[10px] text-white/70">WhatsApp</span>
          </button>
          <button
            onClick={() =>
              openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`)
            }
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#C5A059]/40 transition-colors"
          >
            <Share2 className="w-4 h-4 text-white/70" />
            <span className="text-[10px] text-white/70">Facebook</span>
          </button>
          <button
            onClick={() =>
              openShare(
                `https://twitter.com/intent/tweet?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareMessage)}`
              )
            }
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#C5A059]/40 transition-colors"
          >
            <Share2 className="w-4 h-4 text-white/70" />
            <span className="text-[10px] text-white/70">X</span>
          </button>
        </div>
      </div>
    </div>
  );
}
