import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import toast from 'react-hot-toast';
import styles from './AdminProducts.module.css';

function isAdminAuthed() {
  return sessionStorage.getItem('subwikha_admin') === '1';
}

export default function AdminGallery() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [customerName, setCustomerName] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isAdminAuthed()) { navigate('/admin/login'); return; }
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'gallery'));
      setItems(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    } catch (err) {
      toast.error('Could not load gallery: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('subwikha_admin');
    navigate('/admin/login');
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `gallery/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'gallery'), {
        imageUrl,
        caption: caption.trim(),
        customerName: customerName.trim(),
        approved: true,
        createdAt: serverTimestamp(),
      });
      toast.success('Photo added to gallery!');
      setCaption('');
      setCustomerName('');
      fetchItems();
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleApproved = async (item) => {
    try {
      await updateDoc(doc(db, 'gallery', item.firestoreId), { approved: !item.approved });
      setItems(prev => prev.map(i => i.firestoreId === item.firestoreId ? { ...i, approved: !i.approved } : i));
    } catch {
      toast.error('Failed to update');
    }
  };

  const remove = async (item) => {
    if (!window.confirm('Delete this photo from the gallery?')) return;
    try {
      await deleteDoc(doc(db, 'gallery', item.firestoreId));
      setItems(prev => prev.filter(i => i.firestoreId !== item.firestoreId));
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <img src="/logo.png" alt="" className={styles.topLogo} />
          <div className={styles.topText}>
            <span className={styles.topBrand}>Subwikha's Hub</span>
            <span className={styles.topLabel}>Customer Gallery</span>
          </div>
        </div>
        <nav className={styles.topNav}>
          <NavLink to="/admin/orders"    className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Orders</NavLink>
          <NavLink to="/admin/products"  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Products</NavLink>
          <NavLink to="/admin/analytics" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Analytics</NavLink>
          <NavLink to="/admin/gallery"   className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Gallery</NavLink>
        </nav>
        <div className={styles.topRight}>
          <button className={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.section} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 24 }}>
          <label className={styles.field} style={{ flex: 1, minWidth: 180 }}>
            <span className={styles.label}>Customer Name (optional)</span>
            <input className={styles.input} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Priya" />
          </label>
          <label className={styles.field} style={{ flex: 2, minWidth: 220 }}>
            <span className={styles.label}>Caption (optional)</span>
            <input className={styles.input} value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. Loved the resin coaster!" />
          </label>
          <button className={styles.addProductBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : '+ Upload Photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading gallery...</p>
          </div>
        ) : items.length === 0 ? (
          <p style={{ opacity: 0.6 }}>No photos yet. Upload real customer photos above — approved ones show on the homepage.</p>
        ) : (
          <div className={styles.imgGrid}>
            {items.map(item => (
              <div key={item.firestoreId} className={styles.imgThumb} style={{ width: 160, height: 200 }}>
                <img src={item.imageUrl} alt={item.caption || ''} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                <div style={{ padding: '6px 8px', fontSize: '0.72rem' }}>
                  <p style={{ margin: 0 }}>{item.customerName || 'Anonymous'}</p>
                  <p style={{ margin: '2px 0 6px', opacity: 0.7 }}>{item.caption}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className={styles.editBtn}
                      onClick={() => toggleApproved(item)}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {item.approved ? 'Unapprove' : 'Approve'}
                    </button>
                    <button className={styles.deleteBtn} onClick={() => remove(item)} style={{ fontSize: '0.7rem' }}>Delete</button>
                  </div>
                </div>
                <span className={item.approved ? styles.imgSavedTag : styles.imgNewTag}>
                  {item.approved ? 'Live' : 'Hidden'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
