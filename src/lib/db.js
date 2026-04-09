import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase.js';

// ═══ POZVÁNKY ═══════════════════════════════════════════════════

// Generování dávky QR pozvánkových kódů
export async function generateInviteBatch({ count, batchName }) {
  const genToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let t = 'SWAMP-';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) t += '-';
      t += chars[Math.floor(Math.random() * chars.length)];
    }
    return t;
  };

  const batchId = `batch_${Date.now()}`;
  const batch = writeBatch(db);
  const tokens = [];

  for (let i = 0; i < count; i++) {
    const token = genToken();
    tokens.push(token);
    batch.set(doc(db, 'invites', token), {
      token,
      status: 'unused',
      batchId,
      batchName,
      createdAt: serverTimestamp(),
      usedBy: null,
      usedAt: null,
      type: 'qr',
    });
  }

  await batch.commit();
  return { batchId, batchName, tokens };
}

// Odeslání emailové pozvánky
export async function sendEmailInvite({ email, role, sentBy }) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'EMAIL-';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) token += '-';
    token += chars[Math.floor(Math.random() * chars.length)];
  }

  await setDoc(doc(db, 'emailInvites', token), {
    email,
    role,
    status: 'pending',
    token,
    createdAt: serverTimestamp(),
    sentBy,
  });

  // V produkci: zde zavolat Cloud Function pro odeslání emailu
  // await fetch('/api/sendInviteEmail', { method: 'POST', body: JSON.stringify({ email, token }) });

  return { token, email, role };
}

// Načtení všech pozvánek
export function onInvites(callback) {
  return onSnapshot(
    query(collection(db, 'invites'), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export function onEmailInvites(callback) {
  return onSnapshot(
    query(collection(db, 'emailInvites'), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ═══ UŽIVATELÉ ══════════════════════════════════════════════════

export function onUsers(callback) {
  return onSnapshot(
    query(collection(db, 'users'), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
  );
}

// ═══ AKCE ═══════════════════════════════════════════════════════

export async function createEvent(data) {
  return addDoc(collection(db, 'events'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateEvent(id, data) {
  return updateDoc(doc(db, 'events', id), data);
}

export function onEvents(callback) {
  return onSnapshot(
    query(collection(db, 'events'), orderBy('date', 'desc')),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function getEvent(id) {
  const snap = await getDoc(doc(db, 'events', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ═══ GALERIE ════════════════════════════════════════════════════

export async function uploadPhotos({ eventId, files, uploadedBy }) {
  const photos = [];

  for (const file of files) {
    const filename = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `gallery/${eventId}/${filename}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    photos.push({
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      url,
      caption: file.name.replace(/\.[^.]+$/, ''),
      filename,
    });
  }

  // Najdi existující galerii nebo vytvoř novou
  const q = query(collection(db, 'gallery'), where('eventId', '==', eventId));
  const snap = await getDocs(q);

  if (snap.empty) {
    // Nová galerie
    const event = await getEvent(eventId);
    await addDoc(collection(db, 'gallery'), {
      eventId,
      title: `${event?.title || 'Akce'} — Fotky`,
      photos,
      uploadedBy,
      createdAt: serverTimestamp(),
    });
  } else {
    // Přidej k existující
    const existing = snap.docs[0];
    const existingPhotos = existing.data().photos || [];
    await updateDoc(existing.ref, {
      photos: [...existingPhotos, ...photos],
    });
  }

  return photos;
}

export function onGallery(callback) {
  return onSnapshot(
    query(collection(db, 'gallery'), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export function onGalleryByEvent(eventId, callback) {
  return onSnapshot(
    query(collection(db, 'gallery'), where('eventId', '==', eventId)),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ═══ AUDIO ══════════════════════════════════════════════════════

export async function addAudio({ title, eventId, file, embedUrl, uploadedBy }) {
  const data = {
    title,
    eventId: eventId || null,
    uploadedBy,
    createdAt: serverTimestamp(),
  };

  if (file) {
    // Nahrání audio souboru
    const filename = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `audio/${filename}`);
    await uploadBytes(storageRef, file);
    data.fileUrl = await getDownloadURL(storageRef);
    data.src = 'upload';
    data.filename = file.name;
  } else if (embedUrl) {
    data.embedUrl = embedUrl;
    data.src = embedUrl.includes('soundcloud') ? 'soundcloud' : 'other';
  }

  return addDoc(collection(db, 'audio'), data);
}

export function onAudio(callback) {
  return onSnapshot(
    query(collection(db, 'audio'), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ═══ VIDEO ══════════════════════════════════════════════════════

export async function addVideo({ title, embedUrl, eventId }) {
  return addDoc(collection(db, 'videos'), {
    title,
    embedUrl,
    eventId: eventId || null,
    createdAt: serverTimestamp(),
  });
}

export function onVideos(callback) {
  return onSnapshot(
    query(collection(db, 'videos'), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ═══ CHAT ═══════════════════════════════════════════════════════

export async function sendMessage({ room, text, authorName, authorId }) {
  return addDoc(collection(db, 'messages'), {
    room,
    text,
    authorName,
    authorId,
    createdAt: serverTimestamp(),
  });
}

// Real-time chat — poslouchá na nové zprávy
export function onMessages(room, callback, msgLimit = 100) {
  const q = room === 'all'
    ? query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(msgLimit))
    : query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'desc'), limit(msgLimit));

  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      // Konverze Firestore Timestamp na JS Date
      ts: d.data().createdAt?.toMillis?.() || Date.now(),
    }));
    callback(msgs.reverse()); // Chronologicky
  });
}

// Všechny zprávy (pro agregovaný view)
export function onAllMessages(callback, msgLimit = 200) {
  return onSnapshot(
    query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(msgLimit)),
    (snap) => {
      const msgs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        ts: d.data().createdAt?.toMillis?.() || Date.now(),
      }));
      callback(msgs.reverse());
    }
  );
}
