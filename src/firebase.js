import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBwXChy-AGjQq0EhusiE3QNkvjRr5Vv16I",
  authDomain: "estado-resultados-a0a81.firebaseapp.com",
  projectId: "estado-resultados-a0a81",
  storageBucket: "estado-resultados-a0a81.firebasestorage.app",
  messagingSenderId: "484581453319",
  appId: "1:484581453319:web:8cc73a891206c0d96cc4a2"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
