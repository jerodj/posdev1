import React, { useState, useEffect, useRef } from 'react';
import { usePOSStore } from '../../store/posStore';
import { ChefHat, Lock, User, Utensils, Coffee, Wine } from 'lucide-react';
import toast from 'react-hot-toast';

export function LoginPage() {
  const [staffId, setStaffId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeInput, setActiveInput] = useState<'staffId' | 'pin' | null>(null);
  const staffIdRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const login = usePOSStore(state => state.login);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        // Handle tab navigation between fields
        if (activeInput === 'staffId') {
          setActiveInput('pin');
          e.preventDefault();
        } else if (activeInput === 'pin') {
          setActiveInput(null);
        } else {
          setActiveInput('staffId');
          e.preventDefault();
        }
        return;
      }

      if (activeInput) {
        if (e.key >= '0' && e.key <= '9') {
          // Numeric input
          if (activeInput === 'staffId' && staffId.length < 6) {
            setStaffId(prev => prev + e.key);
          } else if (activeInput === 'pin' && pin.length < 4) {
            setPin(prev => prev + e.key);
          }
        } else if (e.key === 'Backspace') {
          // Backspace handling
          if (activeInput === 'staffId') {
            setStaffId(prev => prev.slice(0, -1));
          } else if (activeInput === 'pin') {
            setPin(prev => prev.slice(0, -1));
          }
        } else if (e.key === 'Escape') {
          // Clear current input
          if (activeInput === 'staffId') {
            setStaffId('');
          } else if (activeInput === 'pin') {
            setPin('');
          }
        } else if (e.key === 'Enter') {
          // Submit on Enter when PIN is complete
          if (activeInput === 'pin' && pin.length === 4) {
            handleSubmit(e as unknown as React.FormEvent);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeInput, staffId, pin]);

  // Auto-focus the active input
  useEffect(() => {
    if (activeInput === 'staffId' && staffIdRef.current) {
      staffIdRef.current.focus();
    } else if (activeInput === 'pin' && pinRef.current) {
      pinRef.current.focus();
    }
  }, [activeInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !pin) {
      toast.error('Please enter both Staff ID and PIN');
      return;
    }

    setLoading(true);
    try {
      const success = await login(staffId, pin);
      if (!success) {
        toast.error('Invalid Staff ID or PIN');
        setPin('');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitInput = (digit: string) => {
    if (activeInput === 'staffId' && staffId.length < 6) {
      setStaffId(prev => prev + digit);
    } else if (activeInput === 'pin' && pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const clearActiveInput = () => {
    if (activeInput === 'staffId') {
      setStaffId('');
    } else if (activeInput === 'pin') {
      setPin('');
    }
  };

  const deleteLastDigit = () => {
    if (activeInput === 'staffId') {
      setStaffId(prev => prev.slice(0, -1));
    } else if (activeInput === 'pin') {
      setPin(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-6 shadow-2xl">
            <div className="flex space-x-1">
              <Utensils className="w-6 h-6 text-indigo-600" />
              <Coffee className="w-6 h-6 text-purple-600" />
              <Wine className="w-6 h-6 text-pink-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          POS
          </h1>
        
          <p className="text-purple-300">Enter your credentials using keyboard or touch</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Staff ID Input */}
            <div>
              <label htmlFor="staffId" className="block text-sm font-semibold text-white mb-3">
                <User className="inline w-5 h-5 mr-2" />
                Staff ID
              </label>
              <div 
                ref={staffIdRef}
                id="staffId"
                tabIndex={0}
                onClick={() => setActiveInput('staffId')}
                onFocus={() => setActiveInput('staffId')}
                className={`w-full px-6 py-4 backdrop-blur-sm border-2 rounded-2xl transition-all cursor-pointer ${
                  activeInput === 'staffId' 
                    ? 'bg-white/30 border-white/50' 
                    : 'bg-white/20 border-white/30'
                }`}
                aria-label="Staff ID input"
                aria-describedby="staffIdHelp"
              >
                <div className="text-center">
                  <div className="text-2xl font-mono text-white tracking-widest">
                    {staffId || '___'}
                  </div>
                </div>
              </div>
              <div id="staffIdHelp" className="text-xs text-white/60 mt-1">
                {staffId.length > 0 ? `${staffId.length}/6 digits` : 'Max 6 digits'}
              </div>
            </div>

            {/* PIN Display */}
            <div>
              <label htmlFor="pin" className="block text-sm font-semibold text-white mb-3">
                <Lock className="inline w-5 h-5 mr-2" />
                PIN
              </label>
              <div 
                ref={pinRef}
                id="pin"
                tabIndex={0}
                onClick={() => setActiveInput('pin')}
                onFocus={() => setActiveInput('pin')}
                className={`w-full px-6 py-4 backdrop-blur-sm border-2 rounded-2xl transition-all cursor-pointer ${
                  activeInput === 'pin' 
                    ? 'bg-white/30 border-white/50' 
                    : 'bg-white/20 border-white/30'
                }`}
                aria-label="PIN input"
                aria-describedby="pinHelp"
              >
                <div className="flex justify-center space-x-3">
                  {[0, 1, 2, 3].map(index => (
                    <div
                      key={index}
                      className={`w-6 h-6 rounded-full transition-all duration-300 ${
                        index < pin.length 
                          ? 'bg-gradient-to-r from-purple-400 to-pink-400 shadow-lg' 
                          : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div id="pinHelp" className="text-xs text-white/60 mt-1">
                {pin.length > 0 ? `${pin.length}/4 digits` : '4 digits required'}
              </div>
            </div>

            {/* Shared Keypad - Only shown when an input is active */}
            {activeInput && (
              <div className="grid grid-cols-3 gap-3 p-4 bg-white/10 rounded-2xl">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigitInput(digit.toString())}
                    className="h-16 bg-white/20 hover:bg-white/30 rounded-xl text-xl font-semibold text-white transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    disabled={
                      (activeInput === 'staffId' && staffId.length >= 6) ||
                      (activeInput === 'pin' && pin.length >= 4)
                    }
                    aria-label={`Number ${digit}`}
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearActiveInput}
                  className="h-16 bg-red-500/30 hover:bg-red-500/40 text-red-200 rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-red-400"
                  aria-label="Clear input"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleDigitInput('0')}
                  className="h-16 bg-white/20 hover:bg-white/30 rounded-xl text-xl font-semibold text-white transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  disabled={
                    (activeInput === 'staffId' && staffId.length >= 6) ||
                    (activeInput === 'pin' && pin.length >= 4)
                  }
                  aria-label="Number 0"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={deleteLastDigit}
                  className="h-16 bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-200 rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  aria-label="Delete last digit"
                >
                  ⌫
                </button>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !staffId || pin.length !== 4}
              className="w-full py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Sign in to POS system"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In to POS'
              )}
            </button>
          </form>

      
        </div>
      </div>
    </div>
  );
}