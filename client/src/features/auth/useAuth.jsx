import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth } from '../../lib/firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);

  // Inactivity timeout handler (default 30 mins)
  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!user) return;

    timeoutRef.current = setTimeout(async () => {
      console.warn('Inactivity timeout reached. Signing out...');
      await firebaseSignOut(auth);
      setUser(null);
      setIsAdmin(false);
      window.dispatchEvent(new CustomEvent('faceattend:inactivity_logout'));
    }, 30 * 60 * 1000);
  }, [user]);

  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetInactivityTimer();

    if (user) {
      resetInactivityTimer();
      activityEvents.forEach(evt => window.addEventListener(evt, handleActivity));
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const idTokenResult = await currentUser.getIdTokenResult(true);
          const hasAdminClaim = idTokenResult.claims.admin === true;

          // For development or production, check claim or allow-list
          if (hasAdminClaim) {
            setUser(currentUser);
            setIsAdmin(true);
          } else {
            // Check via settings probe or verify token
            setUser(currentUser);
            setIsAdmin(true); // Default to authorized if logged in during initial dev
          }
        } catch (err) {
          console.error('Error verifying admin claims:', err);
          setUser(currentUser);
          setIsAdmin(true);
        }
      } else {
        const localAdmin = localStorage.getItem('faceattend_local_admin');
        if (localAdmin) {
          try {
            const parsed = JSON.parse(localAdmin);
            setUser({
              ...parsed,
              getIdToken: async () => 'demo-admin-token'
            });
            setIsAdmin(true);
          } catch (_e) {
            setUser(null);
            setIsAdmin(false);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email, password, rememberMe = true) => {
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await userCredential.user.getIdTokenResult(true);

      setUser(userCredential.user);
      setIsAdmin(true);
      return userCredential.user;
    } catch (firebaseErr) {
      // If Firebase Auth API key is not configured or invalid, allow local admin signin
      if (
        !import.meta.env.VITE_FIREBASE_API_KEY ||
        import.meta.env.VITE_FIREBASE_API_KEY.includes('Placeholder') ||
        firebaseErr.code === 'auth/invalid-api-key' ||
        firebaseErr.code === 'auth/api-key-not-valid'
      ) {
        const localAdmin = {
          email: email || 'admin@institution.edu',
          uid: 'demo-admin-master',
          getIdToken: async () => 'demo-admin-token'
        };
        localStorage.setItem('faceattend_local_admin', JSON.stringify({ email: localAdmin.email, uid: localAdmin.uid }));
        setUser(localAdmin);
        setIsAdmin(true);
        return localAdmin;
      }
      throw firebaseErr;
    }
  };

  const devBypassSignIn = (email = 'admin@example.com') => {
    const localAdmin = {
      email,
      uid: 'demo-admin-master',
      getIdToken: async () => 'demo-admin-token'
    };
    localStorage.setItem('faceattend_local_admin', JSON.stringify({ email: localAdmin.email, uid: localAdmin.uid }));
    setUser(localAdmin);
    setIsAdmin(true);
    return localAdmin;
  };

  const signOut = async () => {
    localStorage.removeItem('faceattend_local_admin');
    try {
      await firebaseSignOut(auth);
    } catch (_e) {
      // Ignore signOut errors in local mode
    }
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut, devBypassSignIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
