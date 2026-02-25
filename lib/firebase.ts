import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };

// Firestore collection names
export const COLLECTIONS = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  USERS: 'users',
  CUSTOMERS: 'customers',
  STREAMS: 'streams',
  COUPONS: 'coupons',
  TRANSACTIONS: 'transactions',
  SHOPS: 'shops',
  BRANDS: 'brands',
  REVIEWS: 'reviews',
  ROLES: 'roles',
  TEAM_MEMBERS: 'team_members',
  MEDIA: 'media',
  BLOG_POSTS: 'blog_posts',
  COLLECTIONS: 'collections',
} as const;
