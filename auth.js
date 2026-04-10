import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase.js';

// ─── Sledování stavu přihlášení ────────────────────────────────
export function onAuth(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Načti profil z Firestore
      const profile = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (profile.exists()) {
        // Aktualizuj lastLogin
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          lastLogin: serverTimestamp()
        });
        callback({ uid: firebaseUser.uid, ...profile.data() });
      } else {
        // Uživatel existuje v Auth ale nemá profil (nemělo by nastat)
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

// ─── Registrace s pozvánkou ─────────────────────────────────────
export async function registerWithInvite({ token, fullName, email, phone, password, nickname }) {
  // 1. Ověř token v Firestore
  const inviteRef = doc(db, 'invites', token);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    // Zkus emailové pozvánky
    const emailInvRef = doc(db, 'emailInvites', token);
    const emailInvSnap = await getDoc(emailInvRef);
    if (!emailInvSnap.exists()) throw new Error('Neplatný kód pozvánky');
    if (emailInvSnap.data().status !== 'pending') throw new Error('Kód již byl použit');

    // Registrace přes emailovou pozvánku
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    const invData = emailInvSnap.data();

    await setDoc(doc(db, 'users', user.uid), {
      fullName,
      nickname: nickname || null,
      email,
      phone,
      role: invData.role || 'member',
      inviteToken: token,
      batchName: null,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    await updateDoc(emailInvRef, {
      status: 'registered',
      usedBy: user.uid,
      usedAt: serverTimestamp(),
    });

    return user;
  }

  // QR pozvánka
  const invData = inviteSnap.data();
  if (invData.status !== 'unused') throw new Error('Kód již byl použit');

  // 2. Vytvoř Firebase Auth účet
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // 3. Vytvoř profil v Firestore
  await setDoc(doc(db, 'users', user.uid), {
    fullName,
    nickname: nickname || null,
    email,
    phone,
    role: 'member',
    inviteToken: token,
    batchName: invData.batchName || null,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  });

  // 4. Označ pozvánku jako použitou
  await updateDoc(inviteRef, {
    status: 'used',
    usedBy: user.uid,
    usedAt: serverTimestamp(),
  });

  return user;
}

// ─── Ověření tokenu ─────────────────────────────────────────────
export async function validateToken(token) {
  // Zkus QR pozvánky
  const invSnap = await getDoc(doc(db, 'invites', token));
  if (invSnap.exists()) {
    const data = invSnap.data();
    if (data.status === 'unused') return { valid: true, type: 'qr', ...data };
    return { valid: false, reason: 'Kód již byl použit' };
  }

  // Zkus emailové pozvánky
  const emailSnap = await getDoc(doc(db, 'emailInvites', token));
  if (emailSnap.exists()) {
    const data = emailSnap.data();
    if (data.status === 'pending') return { valid: true, type: 'email', ...data };
    return { valid: false, reason: 'Pozvánka již byla využita' };
  }

  return { valid: false, reason: 'Neplatný kód' };
}

// ─── Přihlášení ─────────────────────────────────────────────────
export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  await updateDoc(doc(db, 'users', user.uid), {
    lastLogin: serverTimestamp()
  });
  return user;
}

// ─── Odhlášení ──────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
}

// ─── Reset hesla ────────────────────────────────────────────────
export async function resetPassword(email) {
  const actionCodeSettings = {
    url: 'https://pokustone.github.io/swampsound-platform/',
    handleCodeInApp: false,
  };
  await sendPasswordResetEmail(auth, email, actionCodeSettings);
}
