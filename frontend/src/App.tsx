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

export interface StoredAuthUser {
  email: string;
  fullName?: string;
  role_id?: number;
  roles?: string[];
}

export const AUTH_USER_STORAGE_KEY = 'localcraft_user_auth';

export const getStoredAuthUser = (): StoredAuthUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredAuthUser = (user: StoredAuthUser | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
};

const getViewFromPath = (): ViewType => {
  if (typeof window === 'undefined') return 'landing';
  const path = window.location.pathname.toLowerCase();
  const token = getAccessToken();
  const user = getStoredAuthUser();

  const isArtisan = user && (user.role_id === 1 || user.roles?.includes('CRAFT_VILLAGE'));
  const isTourist = user && (user.role_id === 2 || user.roles?.includes('TOURIST'));
  const isAdmin = user && (user.role_id === 3 || user.roles?.includes('ADMIN'));

  // 1. Strict containment for CRAFT_VILLAGE
  // Artisan user CANNOT access customer landing, profile, login, register, etc.
  // They are strictly locked to artisan-dashboard.
  if (token && isArtisan) {
    return 'artisan-dashboard';
  }

  // 2. Strict containment for ADMIN
  if (token && isAdmin) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/admin') {
      window.location.href = '/admin';
    }
    return 'login';
  }

  // 3. Strict containment for TOURIST
  // Tourist user cannot enter artisan portal
  if (token && isTourist) {
    if (path === '/artisan-dashboard' || path === '/artisan' || path === '/artisans') {
      return 'landing';
    }
  }

  // 4. Default path resolution for Tourists and Unauthenticated Guests
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
  const [currentUser, setCurrentUser] = useState<StoredAuthUser | null>(getStoredAuthUser);
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [recoveryOtp, setRecoveryOtp] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'workshops' | 'orders' | 'favorites' | 'preferences'>('profile');

  const showAppToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const navigateTo = (view: ViewType) => {
    const user = currentUser || getStoredAuthUser();
    const token = getAccessToken();
    const isArtisan = user && (user.role_id === 1 || user.roles?.includes('CRAFT_VILLAGE'));
    const isTourist = user && (user.role_id === 2 || user.roles?.includes('TOURIST'));

    // 1. Strict Artisan Containment
    // An artisan cannot navigate away from artisan-dashboard (except logging out)
    if (token && isArtisan) {
      if (view !== 'artisan-dashboard' && view !== 'login') {
        setCurrentView('artisan-dashboard');
        if (window.location.pathname !== '/artisan-dashboard') {
          window.history.pushState({}, '', '/artisan-dashboard');
        }
        return;
      }
    }

    // 2. Strict Tourist Containment
    // A tourist cannot navigate to artisan-dashboard
    if (token && isTourist && view === 'artisan-dashboard') {
      showAppToast('Tài khoản của bạn là Du khách, không có quyền truy cập Cổng Quản lý Làng nghề.');
      setCurrentView('landing');
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
      }
      return;
    }

    // 3. Protected routes check for unauthenticated users
    if ((view === 'artisan-dashboard' || view === 'profile') && !token) {
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
      const targetView = getViewFromPath();
      setCurrentView(targetView);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for unauthorized events from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setStoredAuthUser(null);
      setCurrentView('login');
      if (window.location.pathname !== '/login') {
        window.history.pushState({}, '', '/login');
      }
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Check persistent login on load and route by role
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      authApi
        .getMe()
        .then((res) => {
          if (res.success && res.data) {
            const u = res.data;
            const userData: StoredAuthUser = {
              email: u.email,
              fullName: u.full_name,
              role_id: u.role_id,
              roles: u.roles,
            };
            setIsLoggedIn(true);
            setCurrentUser(userData);
            setStoredAuthUser(userData);

            const isCraftVillage = u.role_id === 1 || u.roles?.includes('CRAFT_VILLAGE');
            const isTourist = u.role_id === 2 || u.roles?.includes('TOURIST');
            const isAdmin = u.role_id === 3 || u.roles?.includes('ADMIN');

            // Enforce Strict Role Isolation
            if (isCraftVillage) {
              // Artisan MUST be strictly at artisan-dashboard
              if (window.location.pathname !== '/artisan-dashboard') {
                setCurrentView('artisan-dashboard');
                window.history.replaceState({}, '', '/artisan-dashboard');
              }
            } else if (isAdmin) {
              // Admin MUST be at /admin
              window.location.href = '/admin';
            } else if (isTourist) {
              // Tourist CANNOT be at artisan-dashboard
              if (window.location.pathname === '/artisan-dashboard') {
                showAppToast('Tài khoản của bạn là Du khách, không có quyền truy cập Cổng Quản lý Làng nghề.');
                setCurrentView('landing');
                window.history.replaceState({}, '', '/');
              }
            }
          }
        })
        .catch(() => {
          setIsLoggedIn(false);
          setCurrentUser(null);
          setStoredAuthUser(null);
          if (currentView === 'artisan-dashboard' || currentView === 'profile') {
            navigateTo('login');
          }
        });
    } else {
      setStoredAuthUser(null);
      if (currentView === 'artisan-dashboard' || currentView === 'profile') {
        navigateTo('login');
      }
    }
  }, []);

  const handleLogout = async () => {
    await authApi.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setStoredAuthUser(null);
    navigateTo('login');
  };

  return (
    <>
      {/* Toast Notification Container for Access Denials */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#984628',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: '999px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
            zIndex: 99999,
            fontSize: '13.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeInDown 0.25s ease',
          }}
          role="alert"
        >
          <span>🛡️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {currentView === 'artisan-dashboard' && (
        <ArtisanDashboardPage
          onBackToHome={() => {
            // Stay within artisan dashboard (overview tab)
            window.history.replaceState({}, '', '/artisan-dashboard');
          }}
          onNavigateToProfile={() => {
            // Open V02 village profile within artisan dashboard
            window.history.replaceState({}, '', '/artisan-dashboard');
          }}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'profile' && (
        <ProfilePage
          userEmail={currentUser?.email}
          userFullName={currentUser?.fullName}
          initialTab={profileInitialTab}
          onBackToHome={() => navigateTo('landing')}
          onNavigateToLogin={handleLogout}
          onChangePassword={() => navigateTo('reset-password')}
          onExploreWorkshops={() => navigateTo('landing')}
        />
      )}

      {currentView === 'login' && (
        <LoginPage
          onBackToHome={() => navigateTo('landing')}
          onSwitchToRegister={() => navigateTo('register')}
          onForgotPassword={() => navigateTo('forgot-password')}
          onLoginSuccess={(user) => {
            setIsLoggedIn(true);
            setCurrentUser(user);
            setStoredAuthUser(user);

            const isCraftVillage = user.role_id === 1 || user.roles?.includes('CRAFT_VILLAGE');
            const isAdmin = user.role_id === 3 || user.roles?.includes('ADMIN');

            if (isCraftVillage) {
              navigateTo('artisan-dashboard');
            } else if (isAdmin) {
              window.location.href = '/admin';
            } else {
              navigateTo('landing');
            }
          }}
        />
      )}

      {currentView === 'register' && (
        <RegisterPage
          onBackToHome={() => navigateTo('landing')}
          onSwitchToLogin={() => navigateTo('login')}
          onRegisterSuccess={(data) => {
            setIsLoggedIn(true);
            const newUser: StoredAuthUser = {
              email: data.email,
              fullName: data.fullName,
              role_id: 2,
              roles: ['TOURIST'],
            };
            setCurrentUser(newUser);
            setStoredAuthUser(newUser);
            navigateTo('profile');
          }}
        />
      )}

      {currentView === 'forgot-password' && (
        <ForgotPasswordPage
          onBackToHome={() => navigateTo('landing')}
          onBackToLogin={() => navigateTo('login')}
          onOtpVerified={(email, otp) => {
            setRecoveryEmail(email);
            setRecoveryOtp(otp);
            navigateTo('reset-password');
          }}
        />
      )}

      {currentView === 'reset-password' && (
        <ResetPasswordPage
          email={recoveryEmail}
          otpCode={recoveryOtp}
          onBackToHome={() => navigateTo('landing')}
          onBackToLogin={() => navigateTo('login')}
          onResetSuccess={() => {
            navigateTo('login');
          }}
        />
      )}

      {currentView === 'landing' && (
        <LandingPage
          onNavigateToLogin={() => navigateTo('login')}
          onNavigateToProfile={(subTab) => {
            if (subTab) setProfileInitialTab(subTab);
            navigateTo('profile');
          }}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
        />
      )}
    </>
  );
};

export default App;
