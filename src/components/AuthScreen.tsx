import React, { useState } from 'react';
import { Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

type AuthMode = 'login' | 'signup';

export const AuthScreen: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setInfoMessage(null);

        if (mode === 'signup' && !agreedToTerms) {
            setError('Please agree to the Terms of Service to continue.');
            return;
        }

        setIsLoading(true);
        try {
            if (mode === 'login') {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
            } else {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { name },
                    },
                });
                if (signUpError) throw signUpError;
                setInfoMessage('Account created! Check your email to confirm, then log in.');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuth = async (provider: 'google' | 'github') => {
        setError(null);
        try {
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (oauthError) throw oauthError;
        } catch (err: any) {
            setError(err.message || `Could not sign in with ${provider}.`);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-sm">
                {/* Brand header */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#DFC386] to-[#C5A059] mx-auto flex items-center justify-center shadow-lg shadow-[#C5A059]/20 mb-3">
                        <span className="font-serif text-2xl font-bold text-[#0A0A0A]">V</span>
                    </div>
                    <h1 className="font-serif text-3xl font-bold text-[#C5A059] tracking-widest">VĀKYA</h1>
                    <p className="text-white/50 text-sm mt-1">
                        {mode === 'login' ? 'Continue your sacred journey' : 'Join a community of scholars exploring ancient wisdom'}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
                    <h2 className="font-serif text-xl text-white text-center">
                        {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
                    </h2>

                    <form onSubmit={handleEmailAuth} className="space-y-3.5">
                        {mode === 'signup' && (
                            <div className="relative">
                                <User className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full bg-[#0F0F0F] border border-white/10 focus:border-[#C5A059]/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-hidden transition-all"
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="email"
                                placeholder="Scholarly Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-[#0F0F0F] border border-white/10 focus:border-[#C5A059]/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-hidden transition-all"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="password"
                                placeholder="Cipher (Password)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-[#0F0F0F] border border-white/10 focus:border-[#C5A059]/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-hidden transition-all"
                            />
                        </div>

                        {mode === 'signup' && (
                            <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded accent-[#C5A059]"
                                />
                                <span>
                                    I agree to the <span className="text-[#C5A059] underline">Terms of Service</span>
                                </span>
                            </label>
                        )}

                        {mode === 'login' && (
                            <div className="text-right">
                                <button
                                    type="button"
                                    className="text-xs text-[#C5A059]/70 hover:text-[#C5A059] underline cursor-pointer"
                                >
                                    Recover Cipher?
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {infoMessage && (
                            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300">
                                {infoMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn-gold py-3 rounded-xl text-[#0A0A0A] text-sm font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : mode === 'login' ? (
                                <>
                                    <Lock className="w-4 h-4" />
                                    <span>Unlock</span>
                                </>
                            ) : (
                                <span>Create Account</span>
                            )}
                        </button>
                    </form>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-[10px] uppercase tracking-wider text-white/30">Or authenticate via</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleOAuth('google')}
                            className="py-2.5 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </button>
                        <button
                            onClick={() => handleOAuth('github')}
                            className="py-2.5 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            GitHub
                        </button>
                    </div>

                    <p className="text-center text-xs text-white/40">
                        {mode === 'login' ? (
                            <>
                                Uninitiated?{' '}
                                <button
                                    onClick={() => {
                                        setMode('signup');
                                        setError(null);
                                        setInfoMessage(null);
                                    }}
                                    className="text-[#C5A059] font-semibold underline cursor-pointer"
                                >
                                    Request Access
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <button
                                    onClick={() => {
                                        setMode('login');
                                        setError(null);
                                        setInfoMessage(null);
                                    }}
                                    className="text-[#C5A059] font-semibold underline cursor-pointer"
                                >
                                    Login
                                </button>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
};