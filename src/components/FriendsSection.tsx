import { useState } from 'react';
import { Search, UserPlus, UserMinus, MessageCircleHeart } from 'lucide-react';
import { useFriends, type FriendProfile } from '../hooks/useFriends';

interface FriendsSectionProps {
  currentUserId: string | null;
}

export function FriendsSection({ currentUserId }: FriendsSectionProps) {
  const { following, followers, follow, unfollow, searchProfiles } = useFriends(currentUserId);
  const [tab, setTab] = useState<'following' | 'followers'>('following');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const followingIds = new Set(following.map((f) => f.id));

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const r = await searchProfiles(q);
    setResults(r.filter((p) => p.id !== currentUserId));
    setSearching(false);
  };

  const handleInviteWhatsApp = () => {
    const message = "I'm learning Sanskrit, Pali & Tamil on Bolvani — come join me!";
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const list = tab === 'following' ? following : followers;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl font-normal text-white">Friends</h3>
        <button
          onClick={handleInviteWhatsApp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] text-xs font-semibold hover:bg-[#C5A059]/20 transition-colors"
        >
          <MessageCircleHeart className="w-3.5 h-3.5" />
          Invite via WhatsApp
        </button>
      </div>

      <div className="bg-[#121212] rounded-2xl border border-white/10 p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Find friends by name..."
            className="w-full bg-[#0A0A0A] border border-white/10 focus:border-[#C5A059]/50 rounded-full pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        {query.trim() && (
          <div className="space-y-1.5">
            {searching && <p className="text-xs text-white/40 px-1">Searching...</p>}
            {!searching && results.length === 0 && <p className="text-xs text-white/40 px-1">No one found.</p>}
            {results.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-[#161616] rounded-xl p-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full bg-cover bg-center bg-white/10"
                    style={p.avatar_url ? { backgroundImage: `url('${p.avatar_url}')` } : undefined}
                  />
                  <div>
                    <p className="text-xs font-medium text-white">{p.name}</p>
                    <p className="text-[10px] text-white/40">{p.total_xp} XP</p>
                  </div>
                </div>
                {followingIds.has(p.id) ? (
                  <button
                    onClick={() => unfollow(p.id)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-white/50 hover:text-rose-400 px-2 py-1 rounded-full border border-white/10 hover:border-rose-400/30 transition-colors"
                  >
                    <UserMinus className="w-3 h-3" /> Unfollow
                  </button>
                ) : (
                  <button
                    onClick={() => follow(p.id)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-[#C5A059] px-2 py-1 rounded-full border border-[#C5A059]/30 hover:bg-[#C5A059]/10 transition-colors"
                  >
                    <UserPlus className="w-3 h-3" /> Follow
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-4 border-t border-white/10 pt-3">
          <button
            onClick={() => setTab('following')}
            className={`text-xs font-semibold uppercase tracking-wider pb-1 border-b-2 transition-colors ${
              tab === 'following' ? 'text-[#C5A059] border-[#C5A059]' : 'text-white/40 border-transparent'
            }`}
          >
            Following ({following.length})
          </button>
          <button
            onClick={() => setTab('followers')}
            className={`text-xs font-semibold uppercase tracking-wider pb-1 border-b-2 transition-colors ${
              tab === 'followers' ? 'text-[#C5A059] border-[#C5A059]' : 'text-white/40 border-transparent'
            }`}
          >
            Followers ({followers.length})
          </button>
        </div>

        <div className="space-y-1.5">
          {list.length === 0 && (
            <p className="text-xs text-white/40 px-1 py-2">
              {tab === 'following' ? "You're not following anyone yet." : 'No followers yet.'}
            </p>
          )}
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 bg-[#161616] rounded-xl p-2.5">
              <div
                className="w-8 h-8 rounded-full bg-cover bg-center bg-white/10"
                style={p.avatar_url ? { backgroundImage: `url('${p.avatar_url}')` } : undefined}
              />
              <div>
                <p className="text-xs font-medium text-white">{p.name}</p>
                <p className="text-[10px] text-white/40">{p.total_xp} XP</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
