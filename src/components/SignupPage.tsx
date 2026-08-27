import React, { useState } from 'react';
import { BookOpen, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface SignupPageProps {
    onSignupSuccess?: () => void;
    onNavigateToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignupSuccess, onNavigateToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setInfoMessage(null);

        if (!name.trim() || !email.trim() || !password) {
            setErrorMessage('Please fill in every field.');
            return;
        }
        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters.');
            return;
        }
        if (!agreedToTerms) {
            setErrorMessage('Please agree to the Terms of Service to continue.');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: { full_name: name.trim() },
                },
            });
            if (error) throw error;

            // If email confirmation is disabled in Supabase, a session comes
            // back immediately and the user is already signed in. If it's
            // enabled, session will be null until they click the email link.
            if (data.session) {
                onSignupSuccess?.();
            } else {
                setInfoMessage('Account created! Check your email to confirm your address, then log in.');
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Something went wrong. Please try again.');
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
                    <h1 className="font-serif text-2xl font-bold text-white">Create Your Account</h1>
                    <p className="text-sm text-white/50 font-light mt-1 max-w-[240px]">
                        Join a community of scholars exploring ancient wisdom.
                    </p>
                </div>

                {/* Card */}
                <div className="bg-[#121212] border border-white/10 border-t-4 border-t-[#C5A059] rounded-2xl shadow-2xl p-6 sm:p-7">
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-[#C5A059] tracking-[0.15em]">
                                Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your full name"
                                autoComplete="name"
                                className="w-full bg-[#0F0F0F] border border-white/15 focus:border-[#C5A059] rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/30 focus:outline-hidden transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-[#C5A059] tracking-[0.15em]">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="scholar@vakya.app"
                                autoComplete="email"
                                className="w-full bg-[#0F0F0F] border border-white/15 focus:border-[#C5A059] rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/30 focus:outline-hidden transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-[#C5A059] tracking-[0.15em]">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                className="w-full bg-[#0F0F0F] border border-white/15 focus:border-[#C5A059] rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/30 focus:outline-hidden transition-all"
                            />
                        </div>

                        <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded text-[#C5A059] focus:ring-[#C5A059] accent-[#C5A059] cursor-pointer"
                            />
                            <span className="text-xs text-white/60">
                                I agree to the{' '}
                                <span className="text-[#C5A059] hover:text-[#DFC386] font-medium">Terms of Service</span>
                            </span>
                        </label>

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
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-white/40 mt-6">
                    Already have an account?{' '}
                    <button
                        type="button"
                        onClick={onNavigateToLogin}
                        className="text-[#C5A059] hover:text-[#DFC386] font-medium transition-colors cursor-pointer"
                    >
                        Login
                    </button>
                </p>
            </div>
        </div>
    );
};