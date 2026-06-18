import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyDSoEI1QrBKvnDKmtLZzhhPaw3yIYMVfjw',
  authDomain:        'subwikhaecommerce.firebaseapp.com',
  projectId:         'subwikhaecommerce',
  storageBucket:     'subwikhaecommerce.firebasestorage.app',
  messagingSenderId: '519966706852',
  appId:             '1:519966706852:web:87d6f23de3ff1cc0346a31',
  measurementId:     'G-1C7MSJXVCN',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
