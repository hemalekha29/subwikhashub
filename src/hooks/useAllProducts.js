import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { products as staticProducts } from '../data/products';

export function useAllProducts() {
  const [fsProducts, setFsProducts] = useState([]);

  useEffect(() => {
    getDocs(collection(db, 'products'))
      .then(snap => {
        // Admin-created products (AdminProducts.jsx) never write a numeric `id` field —
        // only `firestoreId`, and only once already fetched back like this. Without a
        // fallback, every admin product's `.id` is `undefined`, and every place that
        // keys/tracks-by-id (React list keys, HamperBuilder selection, Cart line-item
        // matching) treats every admin product as the same "identity". Falling back to
        // the Firestore document id (always present, always unique) fixes this for every
        // consumer at the source, instead of patching each one individually.
        const data = snap.docs.map(d => ({ firestoreId: d.id, ...d.data(), id: d.data().id ?? d.id }));
        setFsProducts(data);
      })
      .catch(() => {});
  }, []);

  // Firestore products take priority; static products fill the rest. A Firestore doc
  // with `hidden: true` is how the admin panel "deletes" a built-in product it can't
  // actually remove from source — it must still block the static fallback below (that's
  // the whole point), it just doesn't get rendered itself. See AdminProducts.jsx.
  return [
    ...fsProducts.filter(p => !p.hidden),
    ...staticProducts.filter(sp => !fsProducts.some(fp => fp.slug === sp.slug)),
  ];
}
