import React, { useState, useEffect } from 'react';
import LandingPage from '@/features/landing';
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from '@/features/auth';
import ProfilePage from '@/features/profile';
import { authApi, getAccessToken } from '@/services/api';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<
    'landing' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'profile'
  >('landing');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; fullName?: string } | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [recoveryOtp, setRecoveryOtp] = useState<string>('');

  // Check persistent login on load
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      authApi.getMe()
        .then((res) => {
          if (res.success && res.data) {
            setIsLoggedIn(true);
            setCurrentUser({
              email: res.data.email,
              fullName: res.data.full_name,
            });
          }
        })
        .catch(() => {
          setIsLoggedIn(false);
          setCurrentUser(null);
        });
    }
  }, []);

  const handleLogout = async () => {
    await authApi.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentView('login');
  };

  if (currentView === 'profile') {
    return (
      <ProfilePage
        userEmail={currentUser?.email}
        userFullName={currentUser?.fullName}
        onBackToHome={() => setCurrentView('landing')}
        onNavigateToLogin={handleLogout}
        onChangePassword={() => setCurrentView('reset-password')}
        onExploreWorkshops={() => setCurrentView('landing')}
      />
    );
  }

  if (currentView === 'login') {
    return (
      <LoginPage
        onBackToHome={() => setCurrentView('landing')}
        onSwitchToRegister={() => setCurrentView('register')}
        onForgotPassword={() => setCurrentView('forgot-password')}
        onLoginSuccess={(user) => {
          setIsLoggedIn(true);
          setCurrentUser(user);
          setCurrentView('profile');
        }}
      />
    );
  }

  if (currentView === 'register') {
    return (
      <RegisterPage
        onBackToHome={() => setCurrentView('landing')}
        onSwitchToLogin={() => setCurrentView('login')}
        onRegisterSuccess={(data) => {
          setIsLoggedIn(true);
          setCurrentUser({ email: data.email, fullName: data.fullName });
          setCurrentView('profile');
        }}
      />
    );
  }

  if (currentView === 'forgot-password') {
    return (
      <ForgotPasswordPage
        onBackToHome={() => setCurrentView('landing')}
        onBackToLogin={() => setCurrentView('login')}
        onOtpVerified={(email, otp) => {
          setRecoveryEmail(email);
          setRecoveryOtp(otp);
          setCurrentView('reset-password');
        }}
      />
    );
  }

  if (currentView === 'reset-password') {
    return (
      <ResetPasswordPage
        email={recoveryEmail}
        otpCode={recoveryOtp}
        onBackToHome={() => setCurrentView('landing')}
        onBackToLogin={() => setCurrentView('login')}
        onResetSuccess={() => {
          setCurrentView('login');
        }}
      />
    );
  }

  return (
    <LandingPage
      onNavigateToLogin={() => setCurrentView('login')}
      onNavigateToProfile={() => setCurrentView('profile')}
      onLogout={handleLogout}
      isLoggedIn={isLoggedIn}
      currentUser={currentUser}
    />
  );
};

export default App;
