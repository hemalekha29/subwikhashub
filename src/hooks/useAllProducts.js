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

  // Firestore products take priority; static products fill the rest
  return [
    ...fsProducts,
    ...staticProducts.filter(sp => !fsProducts.find(fp => fp.slug === sp.slug)),
  ];
}
