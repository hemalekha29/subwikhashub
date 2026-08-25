import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import styles from './AdminLogin.module.css';

// Real auth: this account must already exist in Firebase Console → Authentication →
// Users (Email/Password provider), and its exact email is the one allow-listed in
// firestore.rules / storage.rules. There is no self-registration path anywhere in
// this app, so knowing the email alone doesn't grant access — only that account's
// password does.
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/admin/orders');
    } catch {
      setError('Incorrect email or password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img src="/logo.png" alt="Subwikha's Hub" className={styles.logo} />
        <h1 className={styles.title}>Admin Panel</h1>
        <p className={styles.sub}>Subwikha's Hub — Order Management</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Admin Email</label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="Enter your admin email"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Admin Password</label>
            <div className={styles.inputWrap}>
              <input
                type={show ? 'text' : 'password'}
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your admin password"
                autoComplete="current-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShow(v => !v)}>
                {show ? '🙈' : '👁️'}
              </button>
            </div>
            {error && <p className={styles.error}>⚠ {error}</p>}
          </div>

          <button type="submit" className={styles.btn} disabled={loading || !email || !password}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              'Login to Dashboard →'
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
