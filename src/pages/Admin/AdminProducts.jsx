import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { products as staticProducts, occasions as OCCASION_OPTIONS } from '../../data/products';
import toast from 'react-hot-toast';
import styles from './AdminProducts.module.css';

function isAdminAuthed() {
  return sessionStorage.getItem('subwikha_admin') === '1';
}

const CATEGORY_OPTIONS = [
  { id: 'bouquets',  label: 'Bouquets' },
  { id: 'frames',    label: 'Photo Frames' },
  { id: 'magnets',   label: 'Fridge Magnets' },
  { id: 'lighting',  label: 'Night Lights' },
  { id: 'pots',      label: 'Flower Pots' },
  { id: 'keychains', label: 'Keychains' },
  { id: 'metal',     label: 'Metal Keychains' },
  { id: 'resin',     label: 'Resin Art' },
  { id: 'coasters',  label: 'Resin Coasters' },
  { id: 'pipe',      label: 'Pipe Cleaner Keychains' },
  { id: 'photo',     label: 'Photo Keychains' },
];
const BADGES = ['New', 'Sale', 'Popular', 'Limited'];

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

// ── Dynamic list helper ───────────────────────────────────────────────────────

function DynList({ items, setItems, placeholder }) {
  return (
    <div className={styles.dynList}>
      {items.map((item, i) => (
        <div key={i} className={styles.dynRow}>
          <input
            className={styles.input}
            value={item}
            onChange={e => setItems(prev => prev.map((x, j) => j === i ? e.target.value : x))}
            placeholder={placeholder}
          />
          <button type="button" className={styles.dynRemove}
            onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className={styles.dynAdd}
        onClick={() => setItems(prev => [...prev, ''])}>+ Add item</button>
    </div>
  );
}

function CustomOptList({ items, setItems }) {
  return (
    <div className={styles.dynList}>
      {items.map((opt, i) => (
        <div key={i} className={styles.dynRow} style={{ flexWrap: 'wrap', gap: 6 }}>
          <input
            className={styles.input}
            style={{ flex: 2 }}
            value={opt.label}
            onChange={e => setItems(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
            placeholder="e.g. Name to Engrave"
          />
          <select
            className={styles.select}
            style={{ flex: 1 }}
            value={opt.type}
            onChange={e => setItems(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
          >
            <option value="text">Free text</option>
            <option value="select">Dropdown choices</option>
          </select>
          {opt.type === 'select' && (
            <input
              className={styles.input}
              style={{ flex: 2 }}
              value={opt.choicesStr}
              onChange={e => setItems(prev => prev.map((x, j) => j === i ? { ...x, choicesStr: e.target.value } : x))}
              placeholder="Comma-separated choices"
            />
          )}
          <button type="button" className={styles.dynRemove}
            onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className={styles.dynAdd}
        onClick={() => setItems(prev => [...prev, { label: '', type: 'text', choicesStr: '' }])}>+ Add personalization option</button>
    </div>
  );
}

// ── Product Drawer (Add / Edit form) ─────────────────────────────────────────

function ProductDrawer({ product, onClose, onSaved }) {
  const isEdit = !!product;
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const [name, setName]             = useState(product?.name || '');
  const [slug, setSlug]             = useState(product?.slug || '');
  const [tagline, setTagline]       = useState(product?.tagline || '');
  const [category, setCategory]     = useState(product?.category || 'bouquets');
  const [badge, setBadge]           = useState(product?.badge || '');
  const [price, setPrice]           = useState(product?.price || '');
  const [origPrice, setOrigPrice]   = useState(product?.originalPrice || '');
  const [deliveryDays, setDelivery] = useState(product?.deliveryDays || '3-5');
  const [description, setDesc]      = useState(product?.description || '');
  const [inStock, setInStock]       = useState(product?.inStock ?? true);
  const [customizable, setCustom]   = useState(product?.customizable ?? false);
  const [rating, setRating]         = useState(product?.rating || 4.5);
  const [reviews, setReviews]       = useState(product?.reviews || 0);
  const [includes, setIncludes]     = useState(
    product?.includes?.length > 0 ? product.includes : ['']
  );
  const [variants, setVariants]     = useState(
    product?.variants?.length > 0 ? product.variants : ['']
  );
  const [occasionTags, setOccasionTags] = useState(product?.occasion || []);
  const [customOpts, setCustomOpts] = useState(
    (product?.customOptions || []).map(o => ({
      label: o.label, type: o.type === 'select' ? 'select' : 'text', choicesStr: (o.choices || []).join(', '),
    }))
  );
  const [stock, setStock] = useState(product?.stock ?? '');

  const toggleOccasion = (occ) => {
    setOccasionTags(prev => prev.includes(occ) ? prev.filter(o => o !== occ) : [...prev, occ]);
  };

  const [existingImgs, setExistingImgs] = useState(product?.images || []);
  const [newFiles, setNewFiles]         = useState([]);
  const [previews, setPreviews]         = useState([]);

  const handleNameChange = v => {
    setName(v);
    if (!isEdit) setSlug(toSlug(v));
  };

  const handleFilePick = e => {
    const files = Array.from(e.target.files);
    setNewFiles(p => [...p, ...files]);
    setPreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeExisting = i => setExistingImgs(p => p.filter((_, j) => j !== i));
  const removeNew = i => {
    URL.revokeObjectURL(previews[i]);
    setNewFiles(p => p.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  };

  const handleSave = async e => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !price || !description.trim()) {
      toast.error('Fill in all required fields (name, slug, price, description)');
      return;
    }
    if (existingImgs.length + newFiles.length === 0) {
      toast.error('Add at least one product image');
      return;
    }
    setSaving(true);
    try {
      const uploaded = await Promise.all(newFiles.map(async file => {
        const ext = file.name.split('.').pop();
        const storageRef = ref(storage, `products/${slug}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
        const snap = await uploadBytes(storageRef, file);
        return getDownloadURL(snap.ref);
      }));

      const data = {
        name: name.trim(),
        slug: slug.trim(),
        tagline: tagline.trim(),
        category,
        badge: badge || null,
        price: Number(price),
        originalPrice: origPrice ? Number(origPrice) : null,
        deliveryDays: deliveryDays.trim(),
        description: description.trim(),
        inStock,
        customizable,
        rating: Number(rating),
        reviews: Number(reviews),
        images: [...existingImgs, ...uploaded],
        includes: includes.filter(x => x.trim()),
        variants: variants.filter(x => x.trim()),
        occasion: occasionTags,
        customOptions: customOpts
          .filter(o => o.label.trim())
          .map(o => ({
            key: toSlug(o.label).replace(/-/g, '_'),
            label: o.label.trim(),
            type: o.type,
            ...(o.type === 'select' ? { choices: o.choicesStr.split(',').map(c => c.trim()).filter(Boolean) } : {}),
          })),
        stock: stock === '' ? null : Number(stock),
        source: 'admin',
        updatedAt: serverTimestamp(),
      };

      if (isEdit) {
        await updateDoc(doc(db, 'products', product.firestoreId), data);
        toast.success('Product updated!');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'products'), data);
        toast.success('Product added!');
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.drawerHead}>
          <h2 className={styles.drawerTitle}>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button className={styles.drawerClose} onClick={onClose}>✕</button>
        </div>

        <form className={styles.drawerForm} onSubmit={handleSave}>
          <div className={styles.drawerBody}>

            {/* Basic Info */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Basic Info</p>
              <div className={styles.row2}>
                <label className={styles.field}>
                  <span className={styles.label}>Product Name *</span>
                  <input className={styles.input} value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Custom Resin Keychain" required />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Slug (URL) *</span>
                  <input className={styles.input} value={slug} onChange={e => setSlug(toSlug(e.target.value))} placeholder="auto-generated" required />
                </label>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>Tagline</span>
                <input className={styles.input} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Short catchy phrase..." />
              </label>
            </div>

            {/* Category */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Category & Label</p>
              <div className={styles.row2}>
                <label className={styles.field}>
                  <span className={styles.label}>Category *</span>
                  <select className={styles.select} value={category} onChange={e => setCategory(e.target.value)}>
                    {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Badge</span>
                  <select className={styles.select} value={badge} onChange={e => setBadge(e.target.value)}>
                    <option value="">None</option>
                    {BADGES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {/* Pricing */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Pricing</p>
              <div className={styles.row3}>
                <label className={styles.field}>
                  <span className={styles.label}>Price (₹) *</span>
                  <input className={styles.input} type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="299" min="0" required />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Original Price (₹)</span>
                  <input className={styles.input} type="number" value={origPrice} onChange={e => setOrigPrice(e.target.value)} placeholder="Optional" min="0" />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Delivery Days</span>
                  <input className={styles.input} value={deliveryDays} onChange={e => setDelivery(e.target.value)} placeholder="3-5" />
                </label>
              </div>
            </div>

            {/* Images */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Product Images *</p>
              <div className={styles.imgGrid}>
                {existingImgs.map((url, i) => (
                  <div key={i} className={styles.imgThumb}>
                    <img src={url} alt="" onError={e => { e.target.src = '/logo.png'; }} />
                    <button type="button" className={styles.imgRemove} onClick={() => removeExisting(i)}>✕</button>
                    <span className={styles.imgSavedTag}>Saved</span>
                  </div>
                ))}
                {previews.map((url, i) => (
                  <div key={`n${i}`} className={styles.imgThumb}>
                    <img src={url} alt="" />
                    <button type="button" className={styles.imgRemove} onClick={() => removeNew(i)}>✕</button>
                    <span className={styles.imgNewTag}>New</span>
                  </div>
                ))}
                <button type="button" className={styles.imgAddBtn} onClick={() => fileRef.current?.click()}>
                  <span className={styles.imgAddIcon}>+</span>
                  <span>Upload</span>
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFilePick} />
              <p className={styles.imgHint}>JPG, PNG or WebP. First image = main image shown in shop.</p>
            </div>

            {/* Description */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Description *</p>
              <textarea className={`${styles.input} ${styles.textarea}`} value={description} onChange={e => setDesc(e.target.value)} placeholder="Describe the product in detail..." rows={4} required />
            </div>

            {/* Includes */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>What's Included</p>
              <DynList items={includes} setItems={setIncludes} placeholder="e.g. Handcrafted resin piece" />
            </div>

            {/* Variants */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Variants / Options</p>
              <DynList items={variants} setItems={setVariants} placeholder="e.g. Pink / Red / Blue" />
            </div>

            {/* Personalization options */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Personalization Options (shown as fields on the product page)</p>
              <CustomOptList items={customOpts} setItems={setCustomOpts} />
            </div>

            {/* Occasions */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Occasions</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {OCCASION_OPTIONS.map(occ => (
                  <label key={occ} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={occasionTags.includes(occ)} onChange={() => toggleOccasion(occ)} />
                    {occ}
                  </label>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Settings</p>
              <div className={styles.row2}>
                <label className={styles.field}>
                  <span className={styles.label}>Rating (0–5)</span>
                  <input className={styles.input} type="number" value={rating} onChange={e => setRating(e.target.value)} step="0.1" min="0" max="5" />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Review Count</span>
                  <input className={styles.input} type="number" value={reviews} onChange={e => setReviews(e.target.value)} min="0" />
                </label>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>Stock Quantity (leave blank for made-to-order / unlimited)</span>
                <input className={styles.input} type="number" value={stock} onChange={e => setStock(e.target.value)} min="0" placeholder="e.g. 10" />
              </label>
              <div className={styles.toggleRow}>
                <label className={styles.toggleLabel}>
                  <div className={`${styles.toggle} ${inStock ? styles.toggleOn : ''}`} onClick={() => setInStock(v => !v)}>
                    <div className={styles.toggleKnob} />
                  </div>
                  In Stock
                </label>
                <label className={styles.toggleLabel}>
                  <div className={`${styles.toggle} ${customizable ? styles.toggleOn : ''}`} onClick={() => setCustom(v => !v)}>
                    <div className={styles.toggleKnob} />
                  </div>
                  Customizable
                </label>
              </div>
            </div>
          </div>

          <div className={styles.drawerFoot}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({ name, onCancel, onConfirm }) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>Delete Product?</h3>
        <p className={styles.modalText}>
          Are you sure you want to delete <strong>"{name}"</strong>? This cannot be undone.
        </p>
        <div className={styles.modalBtns}>
          <button className={styles.modalCancel} onClick={onCancel}>Cancel</button>
          <button className={styles.modalDelete} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminProducts() {
  const navigate = useNavigate();
  const [fsProducts, setFsProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAdminAuthed()) { navigate('/admin/login'); return; }
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      setFsProducts(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Could not load products: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('subwikha_admin');
    navigate('/admin/login');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'products', deleteTarget.firestoreId));
      setFsProducts(p => p.filter(x => x.firestoreId !== deleteTarget.firestoreId));
      toast.success('Product deleted');
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const q = search.toLowerCase();
  const allRows = [
    ...fsProducts.map(p => ({ ...p, _type: 'admin' })),
    ...staticProducts
      .filter(p => !fsProducts.find(fp => fp.slug === p.slug))
      .map(p => ({ ...p, _type: 'static' })),
  ].filter(p => !q || p.name?.toLowerCase().includes(q) || p.category?.includes(q));

  return (
    <>
      <div className={styles.page}>
        <header className={styles.topBar}>
          <div className={styles.topLeft}>
            <img src="/logo.png" alt="" className={styles.topLogo} />
            <div className={styles.topText}>
              <span className={styles.topBrand}>Subwikha's Hub</span>
              <span className={styles.topLabel}>Products</span>
            </div>
          </div>
          <nav className={styles.topNav}>
            <NavLink to="/admin/orders"    className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Orders</NavLink>
            <NavLink to="/admin/products"  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Products</NavLink>
            <NavLink to="/admin/analytics" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Analytics</NavLink>
            <NavLink to="/admin/gallery"   className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Gallery</NavLink>
          </nav>
          <div className={styles.topRight}>
            <button className={styles.addProductBtn} onClick={() => { setEditProduct(null); setDrawerOpen(true); }}>+ Add Product</button>
            <button className={styles.logoutBtn} onClick={logout}>Logout</button>
          </div>
        </header>

        <div className={styles.content}>
          {/* Summary */}
          <div className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryVal}>{staticProducts.length}</span>
              <span className={styles.summaryLbl}>Built-in Products</span>
            </div>
            <div className={`${styles.summaryCard} ${styles.summaryGold}`}>
              <span className={styles.summaryVal}>{fsProducts.length}</span>
              <span className={styles.summaryLbl}>Admin-Added</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryVal}>{staticProducts.length + fsProducts.length}</span>
              <span className={styles.summaryLbl}>Total on Site</span>
            </div>
          </div>

          <input
            className={styles.search}
            placeholder="Search by name or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading products...</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allRows.map(p => (
                    <tr key={`${p._type}-${p.slug}`} className={styles.row}>
                      <td>
                        <img
                          src={p.images?.[0] || '/logo.png'}
                          alt={p.name}
                          className={styles.thumb}
                          onError={e => { e.target.src = '/logo.png'; }}
                        />
                      </td>
                      <td>
                        <div className={styles.productCell}>
                          <span className={styles.productName}>{p.name}</span>
                          <span className={styles.productSlug}>{p.slug}</span>
                        </div>
                      </td>
                      <td><span className={styles.catBadge}>{p.category}</span></td>
                      <td>
                        <div className={styles.priceCell}>
                          <span className={styles.price}>₹{p.price}</span>
                          {p.originalPrice && <span className={styles.origPrice}>₹{p.originalPrice}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.stockBadge} ${p.inStock ? styles.inStock : styles.outStock}`}>
                          {p.inStock ? 'In Stock' : 'Out'}
                        </span>
                        {typeof p.stock === 'number' && (
                          <span
                            style={{
                              display: 'block', marginTop: 4, fontSize: '0.7rem',
                              color: p.stock <= 5 ? '#f87171' : 'inherit', opacity: 0.85,
                            }}
                          >
                            {p.stock} left{p.stock <= 5 ? ' · Low stock' : ''}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.typeBadge} ${p._type === 'static' ? styles.typeStatic : styles.typeAdmin}`}>
                          {p._type === 'static' ? 'Built-in' : 'Admin'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionBtns}>
                          {p._type === 'admin' ? (
                            <>
                              <button className={styles.editBtn} onClick={() => { setEditProduct(p); setDrawerOpen(true); }}>Edit</button>
                              <button className={styles.deleteBtn} onClick={() => setDeleteTarget(p)}>Delete</button>
                            </>
                          ) : (
                            <span className={styles.codeOnly}>Code only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.tableFooter}>{allRows.length} products</p>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <ProductDrawer
          product={editProduct}
          onClose={() => setDrawerOpen(false)}
          onSaved={fetchProducts}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
