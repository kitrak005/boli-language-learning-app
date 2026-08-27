import React, { useState } from 'react';
import { BookOpen, Mail, Lock, Github, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const GoogleMark: React.FC = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.28-.97 2.36-2.06 3.09l3.33 2.58C20.7 17.86 21.8 15.16 21.8 12c0-.74-.07-1.45-.2-2.13H12z" />
        <path fill="#34A853" d="M6.6 14.29l-.75.58-2.66 2.07C4.9 19.6 8.2 21.6 12 21.6c2.4 0 4.42-.79 5.89-2.15l-3.33-2.58c-.79.53-1.8.85-2.56.85-2.6 0-4.8-1.75-5.58-4.1z" />
        <path fill="#4A90E2" d="M3.19 7.06A9.6 9.6 0 002.4 12c0 1.78.43 3.46 1.19 4.94l3.41-2.65c-.2-.6-.32-1.24-.32-1.9 0-.66.12-1.3.32-1.9L3.19 7.06z" />
        <path fill="#FBBC05" d="M12 6.4c1.3 0 2.47.45 3.4 1.33l2.55-2.55C16.4 3.63 14.4 2.8 12 2.8c-3.8 0-7.1 2-8.81 4.94l3.41 2.65C7.2 8.15 9.4 6.4 12 6.4z" />
    </svg>
);

interface LoginPageProps {
    onLoginSuccess?: () => void;
    onNavigateToSignup: () => void;
}

// Turns Supabase's raw auth error into a message that doesn't wrongly
// blame the password when the real issue is an unconfirmed email.
function friendlyAuthError(rawMessage: string): string {
    const lower = rawMessage.toLowerCase();
    if (lower.includes('email not confirmed')) {
        return 'Please confirm your email address first — check your inbox for the confirmation link we sent when you signed up.';
    }
    if (lower.includes('invalid login credentials')) {
        return 'Incorrect email or password. If you just signed up, make sure you\'ve confirmed your email first.';
    }
    return rawMessage;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateToSignup }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setInfoMessage(null);

        if (!email.trim() || !password) {
            setErrorMessage('Please enter both your email and password.');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });
            if (error) throw error;
            onLoginSuccess?.();
        } catch (err: any) {
            setErrorMessage(friendlyAuthError(err?.message || 'Something went wrong. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuth = async (provider: 'google' | 'github') => {
        setErrorMessage(null);
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: { redirectTo: window.location.origin },
            });
            if (error) throw error;
        } catch (err: any) {
            setErrorMessage(err?.message || `Could not start ${provider} sign-in.`);
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setErrorMessage(null);
        setInfoMessage(null);
        if (!email.trim()) {
            setErrorMessage('Enter your email above first, then click "Forgot Password?" to receive a reset link.');
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            setInfoMessage('Password reset link sent — check your inbox.');
        } catch (err: any) {
            setErrorMessage(err?.message || 'Could not send reset email.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] dark-noise-bg flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-sm">
                {/* Brand header */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C5A059] to-[#8e6d34] flex items-center justify-center shadow-lg shadow-[#C5A059]/20 mb-3">
                        <BookOpen className="w-8 h-8 text-[#0A0A0A]" />
                    </div>
                    <h1 className="font-serif text-3xl font-bold tracking-widest text-[#C5A059]">VĀKYA</h1>
                    <p className="text-sm text-white/50 font-light mt-1">Begin Your Journey</p>
                </div>

                {/* Card */}
                <div className="bg-[#121212] border border-white/10 border-t-4 border-t-[#C5A059] rounded-2xl shadow-2xl p-6 sm:p-7">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-[#C5A059] tracking-[0.15em]">
                                Scholarly Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="scholar@vakya.app"
                                    autoComplete="email"
                                    className="w-full bg-[#0F0F0F] border border-white/15 focus:border-[#C5A059] rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder:text-white/30 focus:outline-hidden transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] uppercase font-bold text-[#C5A059] tracking-[0.15em]">
                                    Cipher
                                </label>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-[11px] text-white/40 hover:text-[#C5A059] transition-colors"
                                >
                                    Recover Cipher?
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full bg-[#0F0F0F] border border-white/15 focus:border-[#C5A059] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-white/30 focus:outline-hidden transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{errorMessage}</span>
                            </div>
                        )}
                        {infoMessage && (
                            <div className="p-3 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/30 text-xs text-[#DFC386]">
                                {infoMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#DFC386] to-[#C5A059] hover:brightness-110 text-black text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Unlock</span>}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-[10px] uppercase tracking-wider text-white/30">Or authenticate via</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleOAuth('google')}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/80 text-xs font-medium hover:bg-white/10 hover:border-white/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <GoogleMark />
                            <span>Google</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOAuth('github')}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/80 text-xs font-medium hover:bg-white/10 hover:border-white/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <Github className="w-4 h-4" />
                            <span>GitHub</span>
                        </button>
                    </div>
                </div>

                <p className="text-center text-sm text-white/40 mt-6">
                    Uninitiated?{' '}
                    <button
                        type="button"
                        onClick={onNavigateToSignup}
                        className="text-[#C5A059] hover:text-[#DFC386] font-medium transition-colors cursor-pointer"
                    >
                        Request Access
                    </button>
                </p>
            </div>
        </div>
    );
};