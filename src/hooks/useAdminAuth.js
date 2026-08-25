import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';

// Replaces the old `sessionStorage.getItem('subwikha_admin') === '1'` check (settable
// by anyone from the browser console with zero credentials) with real Firebase
// Authentication. Every admin page calls this instead of hand-rolling its own guard —
// see src/pages/Admin/AdminLogin.jsx for where the sign-in itself happens, and
// firestore.rules for where this identity is actually enforced server-side (the React
// guard below is a UX convenience, not the security boundary).
export function useAdminAuth() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthed(!!user);
      setChecking(false);
      if (!user) navigate('/admin/login', { replace: true });
    });
    return unsub;
  }, [navigate]);

  const logout = () => signOut(auth).then(() => navigate('/admin/login', { replace: true }));

  return { checking, authed, logout };
}
