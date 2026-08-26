import { useState, useRef, useEffect } from 'react';
import { trackEvent } from '../../lib/analytics';
import styles from './ChatWidget.module.css';

const FOCUSABLE_SELECTOR = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const WELCOME_MESSAGE = "Hi! I'm the Subwikha's Hub assistant. Ask me about our products, shipping, payment, returns, or anything else — I'm happy to help. 🎁";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'model', text: WELCOME_MESSAGE }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const openedOnceRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Same focus-trap / Escape-to-close pattern already used for the cart drawer
  // (src/components/Cart/Cart.jsx) — kept consistent rather than reinventing it here.
  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement;
    panelRef.current?.querySelector('input')?.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      lastFocusedRef.current?.focus?.();
    };
  }, [open]);

  function toggleOpen() {
    setOpen(v => {
      const next = !v;
      if (next && !openedOnceRef.current) {
        openedOnceRef.current = true;
        trackEvent('chat_opened', {});
      }
      return next;
    });
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    trackEvent('chat_message_sent', {});

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          // Only the last few turns, and only role+text — matches what api/chat.js
          // itself re-clamps server-side, this just avoids sending more than needed.
          history: nextMessages.slice(-10).map(m => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessages(m => [...m, { role: 'model', text: data.error || 'Something went wrong. Please try again, or DM us on Instagram @subwikhahub.', error: true }]);
      } else {
        setMessages(m => [...m, { role: 'model', text: data.reply }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'model', text: 'Could not reach the assistant. Please check your connection, or DM us on Instagram @subwikhahub.', error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className={styles.btn}
        onClick={toggleOpen}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        aria-expanded={open}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {open && (
        <div
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-label="Chat with Subwikha's Hub assistant"
        >
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <span className={styles.headerName}>Subwikha's Hub Assistant</span>
              <span className={styles.headerSub}>Ask about products, shipping & more</span>
            </div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close chat">
              <CloseIcon small />
            </button>
          </div>

          <div className={styles.messages}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : m.error ? styles.bubbleError : styles.bubbleBot}`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className={`${styles.bubble} ${styles.bubbleBot}`}>
                <span className={styles.typing}><span /><span /><span /></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.form} onSubmit={sendMessage}>
            <input
              type="text"
              className={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your question..."
              aria-label="Type your question"
              maxLength={500}
              disabled={loading}
            />
            <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()} aria-label="Send message">
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

function CloseIcon({ small }) {
  const s = small ? 14 : 24;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
    </svg>
  );
}
