import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-lg active:bg-slate-800 transition"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold tracking-tight text-white m-0">
                {title}
              </h1>
              {isOnline ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  <Wifi className="w-2.5 h-2.5 mr-1" /> Offline Ready
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60">
                  <WifiOff className="w-2.5 h-2.5 mr-1" /> Working Offline
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-slate-400 m-0 leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {rightAction}
        </div>
      </div>
    </header>
  );
};
