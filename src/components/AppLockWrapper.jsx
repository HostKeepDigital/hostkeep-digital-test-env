import { useState, useEffect } from "react";
import LockScreen from "@/pages/LockScreen";

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default function AppLockWrapper({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = () => {
      try {
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