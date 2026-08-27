import React, { useState } from 'react';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';

interface AuthFlowProps {
    onAuthSuccess?: () => void;
}

// Replaces the earlier single-card AuthPage: now renders two genuinely
// separate full-page layouts (matching the reference design) instead of
// toggling fields within one card.
export const AuthFlow: React.FC<AuthFlowProps> = ({ onAuthSuccess }) => {
    const [screen, setScreen] = useState<'login' | 'signup'>('login');

    if (screen === 'signup') {
        return (
            <SignupPage
                onSignupSuccess={onAuthSuccess}
                onNavigateToLogin={() => setScreen('login')}
            />
        );
    }

    return (
        <LoginPage
            onLoginSuccess={onAuthSuccess}
            onNavigateToSignup={() => setScreen('signup')}
        />
    );
};