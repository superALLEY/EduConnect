import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BannedUserModal } from './BannedUserModal';
import { useEffect, useState } from 'react';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { currentUser, userData, loading } = useAuth();
  const location = useLocation();
  const [waitTimeout, setWaitTimeout] = useState(false);

  // Set a timeout for waiting for userData to load
  useEffect(() => {
    if (!loading && currentUser && !userData) {
      const timer = setTimeout(() => {
        setWaitTimeout(true);
      }, 2000); // Wait 2 seconds for userData to load

      return () => clearTimeout(timer);
    }
  }, [loading, currentUser, userData]);

  // Wait for auth to finish loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#18191a]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Show banned modal if user is banned
  if (userData?.banned) {
    return <BannedUserModal />;
  }

  // Check if this is a new signup
  const justSignedUp = sessionStorage.getItem('justSignedUp') === 'true';
  const stripeCompleted = sessionStorage.getItem('stripeCompleted') === 'true';
  
  // If user just signed up and doesn't have profile data, redirect to complete-profile
  // (unless they're already on complete-profile or stripe-return pages, or if they just completed Stripe)
  if (justSignedUp && !userData && !stripeCompleted && location.pathname !== '/complete-profile' && location.pathname !== '/stripe-return') {
    return <Navigate to="/complete-profile" replace />;
  }

  // If userData is still loading (null) but user is logged in and not a new signup,
  // wait a bit for the profile to be created automatically for legacy users
  // IMPORTANT: Also check if userData exists but is still loading - don't redirect if userData exists
  // Don't redirect if Stripe was just completed (userData will load shortly)
  if (!userData && !justSignedUp && !stripeCompleted && location.pathname !== '/complete-profile' && location.pathname !== '/stripe-return') {
    // If timeout has passed and still no userData, redirect to complete-profile
    if (waitTimeout) {
      console.warn('Profile creation timeout - redirecting to complete-profile');
      return <Navigate to="/complete-profile" replace />;
    }
    
    // Still waiting for profile to be created
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#18191a]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}