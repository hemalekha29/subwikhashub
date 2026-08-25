import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { products as staticProducts } from '../data/products';

export function useAllProducts() {
  const [fsProducts, setFsProducts] = useState([]);

  useEffect(() => {
    getDocs(collection(db, 'products'))
      .then(snap => {
        const data = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
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
