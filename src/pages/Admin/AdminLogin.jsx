import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminLogin.module.css';

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || 'subwikha@admin2024';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (password === ADMIN_PASS) {
        sessionStorage.setItem('subwikha_admin', '1');
        navigate('/admin/orders');
      } else {
        setError('Incorrect password. Please try again.');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img src="/logo.png" alt="Subwikha's Hub" className={styles.logo} />
        <h1 className={styles.title}>Admin Panel</h1>
        <p className={styles.sub}>Subwikha's Hub — Order Management</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Admin Password</label>
            <div className={styles.inputWrap}>
              <input
                type={show ? 'text' : 'password'}
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your admin password"
                autoFocus
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShow(v => !v)}>
                {show ? '🙈' : '👁️'}
              </button>
            </div>
            {error && <p className={styles.error}>⚠ {error}</p>}
          </div>

          <button type="submit" className={styles.btn} disabled={loading || !password}>
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
