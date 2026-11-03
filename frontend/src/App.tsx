import React, { useState, useEffect } from 'react';
import LandingPage from '@/features/landing';
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from '@/features/auth';
import ProfilePage from '@/features/profile';
import ArtisanDashboardPage from '@/features/artisans';
import { authApi, getAccessToken } from '@/services/api';

type ViewType =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'profile'
  | 'artisan-dashboard';

const getViewFromPath = (): ViewType => {
  if (typeof window === 'undefined') return 'landing';
  const path = window.location.pathname.toLowerCase();
  const token = getAccessToken();

  if (path === '/login') return 'login';
  if (path === '/register') return 'register';
  if (path === '/forgot-password') return 'forgot-password';
  if (path === '/reset-password') return 'reset-password';
  if (path === '/profile') {
    return token ? 'profile' : 'login';
  }
  if (path === '/artisan-dashboard' || path === '/artisan' || path === '/artisans') {
    return token ? 'artisan-dashboard' : 'login';
  }
  return 'landing';
};

const getPathFromView = (view: ViewType): string => {
  switch (view) {
    case 'landing':
      return '/';
    case 'login':
      return '/login';
    case 'register':
      return '/register';
    case 'forgot-password':
      return '/forgot-password';
    case 'reset-password':
      return '/reset-password';
    case 'profile':
      return '/profile';
    case 'artisan-dashboard':
      return '/artisan-dashboard';
  }
};

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(getViewFromPath);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!getAccessToken());
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    fullName?: string;
    role_id?: number;
    roles?: string[];
  } | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [recoveryOtp, setRecoveryOtp] = useState<string>('');

  const navigateTo = (view: ViewType) => {
    // Protected routes check
    if ((view === 'artisan-dashboard' || view === 'profile') && !getAccessToken()) {
      setCurrentView('login');
      if (window.location.pathname !== '/login') {
        window.history.pushState({}, '', '/login');
      }
      return;
    }

    setCurrentView(view);
    const targetPath = getPathFromView(view);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  // Sync browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getViewFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for unauthorized events from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentView('login');
      if (window.location.pathname !== '/login') {
        window.history.pushState({}, '', '/login');
      }
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Check persistent login on load and route by role_id
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      authApi
        .getMe()
        .then((res) => {
          if (res.success && res.data) {
            const u = res.data;
            setIsLoggedIn(true);
            setCurrentUser({
              email: u.email,
              fullName: u.full_name,
              role_id: u.role_id,
              roles: u.roles,
            });
            // If user is at root or login and has CRAFT_VILLAGE role, guide to artisan dashboard
            const isCraftVillage = u.role_id === 1 || u.roles?.includes('CRAFT_VILLAGE');
            if (isCraftVillage && (window.location.pathname === '/login' || window.location.pathname === '/artisan-dashboard')) {
              navigateTo('artisan-dashboard');
            }
          }
        })
        .catch(() => {
          setIsLoggedIn(false);
          setCurrentUser(null);
          if (currentView === 'artisan-dashboard' || currentView === 'profile') {
            navigateTo('login');
          }
        });
    } else if (currentView === 'artisan-dashboard' || currentView === 'profile') {
      navigateTo('login');
    }
  }, []);

  const handleLogout = async () => {
    await authApi.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
    navigateTo('login');
  };

  if (currentView === 'artisan-dashboard') {
    return (
      <ArtisanDashboardPage
        onBackToHome={() => navigateTo('landing')}
        onNavigateToProfile={() => navigateTo('profile')}
        onLogout={handleLogout}
      />
    );
  }

  if (currentView === 'profile') {
    return (
      <ProfilePage
        userEmail={currentUser?.email}
        userFullName={currentUser?.fullName}
        onBackToHome={() => navigateTo('landing')}
        onNavigateToLogin={handleLogout}
        onNavigateToArtisanDashboard={() => navigateTo('artisan-dashboard')}
        onChangePassword={() => navigateTo('reset-password')}
        onExploreWorkshops={() => navigateTo('landing')}
      />
    );
  }

  if (currentView === 'login') {
    return (
      <LoginPage
        onBackToHome={() => navigateTo('landing')}
        onSwitchToRegister={() => navigateTo('register')}
        onForgotPassword={() => navigateTo('forgot-password')}
        onLoginSuccess={(user) => {
          setIsLoggedIn(true);
          setCurrentUser(user);
          // Kiểm tra role_id của tài khoản đăng nhập để điều hướng tới trang web chính xác:
          // role_id === 1 (hoặc CRAFT_VILLAGE) => chuyển hướng tới trang artisans
          if (user.role_id === 1 || user.roles?.includes('CRAFT_VILLAGE')) {
            navigateTo('artisan-dashboard');
          } else {
            // role_id === 2 (hoặc TOURIST) => chuyển hướng tới trang khách hàng
            navigateTo('landing');
          }
        }}
      />
    );
  }

  if (currentView === 'register') {
    return (
      <RegisterPage
        onBackToHome={() => navigateTo('landing')}
        onSwitchToLogin={() => navigateTo('login')}
        onRegisterSuccess={(data) => {
          setIsLoggedIn(true);
          setCurrentUser({ email: data.email, fullName: data.fullName });
          navigateTo('profile');
        }}
      />
    );
  }

  if (currentView === 'forgot-password') {
    return (
      <ForgotPasswordPage
        onBackToHome={() => navigateTo('landing')}
        onBackToLogin={() => navigateTo('login')}
        onOtpVerified={(email, otp) => {
          setRecoveryEmail(email);
          setRecoveryOtp(otp);
          navigateTo('reset-password');
        }}
      />
    );
  }

  if (currentView === 'reset-password') {
    return (
      <ResetPasswordPage
        email={recoveryEmail}
        otpCode={recoveryOtp}
        onBackToHome={() => navigateTo('landing')}
        onBackToLogin={() => navigateTo('login')}
        onResetSuccess={() => {
          navigateTo('login');
        }}
      />
    );
  }

  return (
    <LandingPage
      onNavigateToLogin={() => navigateTo('login')}
      onNavigateToProfile={() => navigateTo('profile')}
      onNavigateToArtisanDashboard={() => navigateTo('artisan-dashboard')}
      onLogout={handleLogout}
      isLoggedIn={isLoggedIn}
      currentUser={currentUser}
    />
  );
};

export default App;
