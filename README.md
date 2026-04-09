# SwampSound System — Community Website

Uzavřená komunitní stránka pro SwampSound System soundsystem crew.

## Co je potřeba

1. **Node.js** (v18+) — [nodejs.org](https://nodejs.org)
2. **Firebase účet** (zdarma) — [firebase.google.com](https://firebase.google.com)
3. **GitHub účet** — [github.com](https://github.com)

## Rychlý start

### 1. Firebase projekt

1. Jdi na [Firebase Console](https://console.firebase.google.com)
2. Klikni **Add project** → pojmenuj ho `swampsound`
3. V nastavení projektu:
   - **Authentication** → Sign-in method → Zapni **Email/Password**
   - **Firestore Database** → Create database → Start in **test mode**
   - **Storage** → Get started
4. V Project Settings → General → Your apps → klikni na Web icon `</>`
5. Pojmenuj app `swampsound-web`, zaškrtni **Firebase Hosting** (nepovinné)
6. Zkopíruj konfiguraci (firebaseConfig objekt)

### 2. Nastavení projektu

```bash
# Naklonuj repozitář
git clone https://github.com/TVŮJ-USERNAME/swampsound-system.git
cd swampsound-system

# Nainstaluj závislosti
npm install

# Zkopíruj konfigurační soubor a doplň Firebase údaje
cp src/lib/firebase.config.example.js src/lib/firebase.config.js
# Otevři src/lib/firebase.config.js a vlož svou Firebase konfiguraci
```

### 3. Vytvoření admin účtu

```bash
# Spusť setup skript (vytvoří prvního admina)
npm run setup
```

Nebo ručně ve Firebase Console → Authentication → Add user.
Poté ve Firestore vytvoř dokument `users/{uid}` s `role: "admin"`.

### 4. Lokální vývoj

```bash
npm run dev
# Otevře se na http://localhost:5173
```

### 5. Deploy na GitHub Pages

```bash
# Nastav repozitář na GitHubu
# V Settings → Pages → Source: GitHub Actions

git add .
git commit -m "Initial deploy"
git push origin main
# GitHub Actions automaticky buildne a nasadí
```

### 6. Vlastní doména (později)

V GitHub repo → Settings → Pages → Custom domain → zadej svou doménu.
U svého registrátora nastav DNS:
- `CNAME` záznam: `www.swampsound.cz` → `tvuj-username.github.io`
- Nebo `A` záznamy pro apex doménu

## Struktura projektu

```
src/
  components/    # UI komponenty
  lib/
    firebase.js  # Firebase inicializace
    db.js        # Firestore operace
    auth.js      # Autentizace
  App.jsx        # Hlavní aplikace (prototyp UI)
  main.jsx       # Entry point
```

## Firestore Rules (produkce)

Po odladění přepni z test mode na pravidla v souboru `firestore.rules`.

## Náklady

- **GitHub Pages**: zdarma
- **Firebase Free Tier (Spark)**:
  - Auth: 50k uživatelů
  - Firestore: 1GB storage, 50k reads/day
  - Storage: 5GB, 1GB download/day
  - Pro komunitu do ~500 lidí víc než dost
