import { useState, useEffect } from "react";
import LockScreen from "@/pages/LockScreen";
import { base44 } from "@/api/base44Client";

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default function AppLockWrapper({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // If the user is already logged in via Base44, skip the lock screen entirely
        const loggedIn = await base44.auth.isAuthenticated();
        if (loggedIn) {
          setIsAuthenticated(true);
          setIsChecking(false);
          return;
        }

        // Otherwise check the session token from the lock screen
        const sessionToken = sessionStorage.getItem('app_access_token');
        const accessTime = sessionStorage.getItem('app_access_time');
        
        if (sessionToken && accessTime) {
          const elapsed = Date.now() - parseInt(accessTime);
          if (elapsed < SESSION_DURATION) {
            setIsAuthenticated(true);
          } else {
            sessionStorage.removeItem('app_access_token');
            sessionStorage.removeItem('app_access_time');
          }
        }
      } catch (e) {
        // Silent fail
      }
      setIsChecking(false);
    };

    checkAccess();
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-gray-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LockScreen onAuthenticated={handleAuthenticated} />;
  }

  return children;
}