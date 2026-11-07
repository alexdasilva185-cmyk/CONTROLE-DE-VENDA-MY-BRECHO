import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
  firebaseProjectId,
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggingIn: boolean;
  authError: string | null;
  authErrorCode: string | null;
  isUnauthorizedDomain: boolean;
  currentDomain: string;
  firebaseConsoleUrl: string;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isLoggingIn: false,
  authError: null,
  authErrorCode: null,
  isUnauthorizedDomain: false,
  currentDomain: '',
  firebaseConsoleUrl: '',
  clearAuthError: () => {},
  signInWithGoogle: async () => {},
  signInWithGoogleRedirect: async () => {},
  signOutUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseConsoleUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`;

  const clearAuthError = () => {
    setAuthError(null);
    setAuthErrorCode(null);
  };

  const handleAuthError = (error: any) => {
    const code = error?.code || '';
    setAuthErrorCode(code);

    if (code === 'auth/unauthorized-domain') {
      setAuthError(
        `O domínio "${currentDomain}" não está autorizado no Firebase Authentication. Para permitir o login com Google na Vercel, este domínio precisa ser adicionado nos Domínios Autorizados do Firebase.`
      );
    } else if (code === 'auth/popup-blocked') {
      setAuthError(
        'O navegador bloqueou a janela pop-up do Google. Por favor, permita pop-ups para este site ou clique em "Entrar via Redirecionamento".'
      );
    } else if (code === 'auth/popup-closed-by-user') {
      setAuthError('A janela de login com o Google foi fechada antes de completar a autenticação.');
    } else if (code === 'auth/cancelled-popup-request') {
      // Ignora clique duplo
    } else {
      setAuthError(error?.message || 'Falha ao conectar com o Google. Verifique sua conexão e tente novamente.');
    }
  };

  useEffect(() => {
    // Process redirect result if returning from a mobile redirect flow
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
          clearAuthError();
        }
      })
      .catch((error) => {
        console.error('Erro no retorno do redirect:', error);
        handleAuthError(error);
      });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    clearAuthError();
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      clearAuthError();
    } catch (error: any) {
      console.error('Erro ao fazer login com Google:', error);
      handleAuthError(error);
      // If popup was blocked, we don't automatically redirect without asking, but we make option visible
    } finally {
      setIsLoggingIn(false);
    }
  };

  const signInWithGoogleRedirect = async () => {
    clearAuthError();
    setIsLoggingIn(true);
    try {
      await signInWithRedirect(auth, googleAuthProvider);
    } catch (error: any) {
      console.error('Erro ao redirecionar para login Google:', error);
      handleAuthError(error);
      setIsLoggingIn(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      clearAuthError();
    } catch (error) {
      console.error('Erro ao sair da conta:', error);
      throw error;
    }
  };

  const isUnauthorizedDomain = authErrorCode === 'auth/unauthorized-domain';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggingIn,
        authError,
        authErrorCode,
        isUnauthorizedDomain,
        currentDomain,
        firebaseConsoleUrl,
        clearAuthError,
        signInWithGoogle,
        signInWithGoogleRedirect,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
