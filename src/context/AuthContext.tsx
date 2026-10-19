import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  SUPER_ADMIN_EMAIL,
  handleFirestoreError,
  OperationType,
  sanitizeFirestorePayload,
} from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  saveUserProfile: (profileData: {
    role: string;
    department: string;
    jobDescription: string;
  }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const email = user.email?.toLowerCase().trim();
    return email === SUPER_ADMIN_EMAIL.toLowerCase().trim();
  }, [user]);

  const fetchProfile = async (uid: string) => {
    const userDocRef = doc(db, 'users', uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // Ensure photoURL is populated
        if (!data.photoURL && auth.currentUser?.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim()) {
          data.photoURL = '/src/assets/images/lead_diver_photo_1792400579018.jpg';
        }
        setUserProfile(data);
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      // We don't block auth state if profile does not yet exist
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await fetchProfile(result.user.uid);
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setError(err?.message || 'Authentication failed. Please try again.');
    }
  };

  const signOutUser = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err?.message || 'Failed to sign out.');
    }
  };

  const saveUserProfile = async (profileData: {
    role: string;
    department: string;
    jobDescription: string;
  }) => {
    if (!user) throw new Error('Cannot update profile: No user authenticated.');
    setError(null);

    const now = new Date().toISOString();
    const userDocRef = doc(db, 'users', user.uid);
    const sanitizedData = sanitizeFirestorePayload({
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Lead Diver',
      photoURL: user.photoURL || userProfile?.photoURL || (isSuperAdmin ? '/src/assets/images/lead_diver_photo_1792400579018.jpg' : ''),
      role: profileData.role.trim(),
      department: profileData.department.trim(),
      jobDescription: profileData.jobDescription.trim(),
      isSuperAdmin: isSuperAdmin,
      updatedAt: now,
      createdAt: userProfile?.createdAt || now,
    });

    try {
      await setDoc(userDocRef, sanitizedData, { merge: true });
      setUserProfile(sanitizedData as UserProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isSuperAdmin,
        loading,
        error,
        signInWithGoogle,
        signOutUser,
        saveUserProfile,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
