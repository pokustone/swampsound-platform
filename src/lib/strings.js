// ═══ UI Strings — SwampSound System ═══════════════════════════
// Změň tento soubor pro překlad celé aplikace.
// Pro přidání jazyka: zkopíruj objekt `cs` a přejmenuj na `en`, `de` atd.

const cs = {
  // ─── Obecné ─────────────────────────────────────
  appName: "Platform",
  appSub: "Underground",
  est: "Est. 2026",
  loading: "Načítání...",
  save: "Uložit",
  saving: "Ukládám...",
  cancel: "Zrušit",
  delete: "Smazat",
  close: "Zavřít",
  show: "Zobrazit",
  hide: "Skrýt",
  back: "← Zpět",
  add: "+ Přidat",
  reset: "Reset",
  send: "Odeslat",
  confirm: "Potvrdit",
  yes: "Ano",
  no: "Ne",

  // ─── Navigace ───────────────────────────────────
  navDashboard: "Nástěnka",
  navEvents: "Akce",
  navGallery: "Galerie",
  navMedia: "Audio/Video",
  navChat: "Chat",
  navAdmin: "Admin",
  navLogout: "Odhlásit",

  // ─── Landing ────────────────────────────────────
  landingText: "Uzavřená komunita pro ty, kteří vědí.",
  landingLogin: "Přihlásit se",
  landingInvite: "Mám pozvánku",

  // ─── Login ──────────────────────────────────────
  loginTitle: "Přihlášení",
  loginEmail: "Email",
  loginPassword: "Heslo",
  loginSubmit: "Vstoupit",
  loginSubmitting: "Přihlašuji...",
  loginForgot: "Zapomenuté heslo",
  loginHaveInvite: "Mám pozvánku",
  loginErrEmpty: "Vyplňte email a heslo",
  loginErrBad: "Nesprávný email nebo heslo",
  loginErrPw: "Nesprávné heslo",
  loginErrRate: "Příliš mnoho pokusů, zkuste později",
  loginErrGeneric: "Chyba přihlášení",
  loginResetPrompt: "Vyplňte email pro reset",
  loginResetSent: "Email s odkazem na reset hesla byl odeslán.",

  // ─── Registrace ─────────────────────────────────
  regTitle: "Registrace",
  regInviteCode: "Kód pozvánky",
  regInvitePh: "SWAMP-XXXX-XXXX-XXXX",
  regVerify: "Ověřit",
  regFullName: "Celé jméno",
  regPhone: "Telefon",
  regPhonePh: "+420 ...",
  regPwPh: "Min. 8, A-z, 0-9",
  regPwAgain: "Heslo znovu",
  regNickname: "Přezdívka (volitelné)",
  regSubmit: "Registrovat",
  regSubmitting: "Vytvářím...",
  regErrCode: "Zadejte kód",
  regErrUsed: "Kód již byl použit",
  regErrInvalid: "Neplatný kód",
  regErrEmail: "Email je již registrován",
  regErrEmailFormat: "Neplatný formát emailu",
  regErrPhoneFormat: "Telefon musí začínat předvolbou (např. +420)",
  regErrPhoneDigits: "Nesprávný počet číslic v telefonním čísle",
  regErrPhoneExists: "Toto telefonní číslo je již registrováno",
  regErrEmailExists: "Tento email je již registrován",
  regErrFill: "Vyplňte",
  regErrEmailBad: "Neplatný",
  regErrPwMatch: "Neshodují se",

  // ─── Validace hesla ─────────────────────────────
  pwMin8: "Min. 8 znaků",
  pwUpper: "Velké písmeno",
  pwLower: "Malé písmeno",
  pwDigit: "Číslice",

  // ─── Dashboard ──────────────────────────────────
  dashWelcome: "Vítej zpět",
  dashUpcoming: "Nadcházející akce",
  dashNoUpcoming: "Žádné nadcházející akce.",
  dashPast: "Proběhlé",
  dashNoPast: "Zatím žádné.",
  dashSettings: "Nastavení",

  // ─── Akce ───────────────────────────────────────
  evTitle: "Akce",
  evNew: "Nová akce",
  evEdit: "Upravit akci",
  evName: "Název",
  evDate: "Datum",
  evLocation: "Místo",
  evDesc: "Popis",
  evStatus: "Stav",
  evStatusUpcoming: "Nadcházející",
  evStatusPast: "Proběhlá",
  evCreate: "Vytvořit",
  evSaveChanges: "Uložit změny",
  evDeleteConfirm: (t) => `Smazat akci "${t}"?`,
  evNotFound: "Nenalezena",
  evBackToEvents: "← Zpět na akce",
  evSearch: "Hledat název nebo artista...",
  evDateFrom: "Od",
  evDateTo: "Do",
  evNoResults: "Žádné akce",
  evNoResultsFor: (q) => `Žádné akce pro "${q}".`,
  evFlyer: "Leták",
  evFlyerDrop: "JPG, PNG letáku",

  // ─── Lineup ─────────────────────────────────────
  lineup: "Lineup",
  lineupName: "Jméno / alias",
  lineupAddArtist: "+ Přidat umělce",
  lineupAddLink: "Přidat odkaz",

  // ─── Galerie ────────────────────────────────────
  galTitle: "Galerie",
  galNewFolder: "+ Nová složka",
  galFolderName: "Název složky",
  galToEvent: "K akci",
  galOwnName: "— vlastní název —",
  galNoEvent: "— bez přiřazení —",
  galExistsNote: "✓ Galerie pro tuto akci existuje — fotky budou přidány k existující.",
  galDrop: "Přetáhni fotky",
  galDropDetail: "Přetáhni fotky (JPG, PNG, WebP)",
  galAddPhotos: "+ Fotky",
  galAddToFolder: "Přidej fotky do této složky",
  galAddMore: "Přidej fotky",
  galDeleteConfirm: (t) => `Smazat galerii "${t}"?`,
  galDeletePhoto: "Smazat fotku?",
  galDeleteGallery: "Smazat galerii",
  galNoPhotos: "Žádné fotky.",
  galPhotosCount: (n) => `${n} fotek`,
  galSaveCount: (n) => `Uložit (${n} fotek)`,
  galAddCount: (n) => `Přidat ${n} fotek`,
  galNeedName: "Vyplň název složky nebo vyber akci.",

  // ─── Audio / Video ──────────────────────────────
  mediaTitle: "Audio / Video",
  mediaAudioName: "Název nahrávky",
  mediaVideoName: "Název videa",
  mediaToEvent: "K akci (volitelné)",
  mediaToEventNone: "— bez —",
  mediaNoAudio: "Žádné nahrávky.",
  mediaNoVideo: "Žádná videa.",
  mediaAudioDrop: "MP3, WAV, FLAC...",
  mediaAudioDropDetail: "MP3, WAV, FLAC, OGG...",
  mediaSc: "Nebo SoundCloud",
  mediaNoStorage: "Audio soubor — nahrávání přes Storage zatím nedostupné",
  mediaDeleteAudio: "Smazat audio?",
  mediaDeleteVideo: "Smazat video?",

  // ─── Chat ───────────────────────────────────────
  chatTitle: "Chat",
  chatAll: "Vše",
  chatGeneral: "Hlavní",
  chatGeneralFull: "Hlavní chat",
  chatEmpty: "Zatím žádné zprávy.",
  chatPlaceholder: "Napiš zprávu...",
  chatPlaceholderAll: "Piš do hlavního chatu...",
  chatDeleteConfirm: "Smazat zprávu?",
  chatDeleteError: "Nelze smazat: ",
  chatStart: "Začni diskuzi!",
  chatMsgCount: (n) => `${n} zpráv`,
  chatSearch: "Hledat v chatu...",
  chatFilterUser: "Příspěvky od",
  chatNoMatch: "Žádné výsledky.",

  // ─── Diskuze v akci ─────────────────────────────
  evDiscussion: (n) => `Diskuze (${n})`,

  // ─── Admin ──────────────────────────────────────
  adminTitle: "Admin",
  adminTabQr: "QR pozvánky",
  adminTabEmail: "Email",
  adminTabUsers: "Uživatelé",
  adminGenBatch: "Generovat dávku",
  adminBatchName: "Název dávky",
  adminBatchPh: "Např. Swamp Session #127",
  adminBatchCount: "Kusů",
  adminBatchPerA4: "Na A4",
  adminGenerate: "Generovat",
  adminGenerating: "Generuji...",
  adminGenerated: (n) => `Vygenerováno ${n}`,
  adminQrCodes: "QR kódy",
  adminEmailLabel: "Email",
  adminRole: "Role",
  adminRoleMember: "Člen",
  adminRoleAdmin: "Admin",
  adminEmailSent: (em, tok) => `Odesláno → ${em} · ${tok}`,
  adminRegistered: "Registrován",
  adminPending: "Čeká",
  adminEmailInvites: (n) => `Email pozvánky (${n})`,
  adminUsersCount: (n) => `Uživatelé (${n})`,
  adminDeleteUser: "Smazat uživatele",
  adminDeleteUserConfirm: (name) => `Opravdu smazat uživatele "${name}"? Tato akce je nevratná.`,
  adminCannotDeleteSelf: "Nemůžeš smazat sám sebe.",
  adminBatch: "Dávka",
  adminRegistration: "Registrace",
  adminLogin: "Login",

  // ─── Admin docs ─────────────────────────────────
  adminDocs: "Organizátorské dokumenty (admin)",
  adminDocsDesc: "Odkazy na Google Docs, PDF, tasky atd. — viditelné jen pro adminy.",
  adminDocsTitle: "Název",
  adminDocsUrl: "https://docs.google.com/...",

  // ─── Notifikace ─────────────────────────────────
  notifTitle: "Notifikace",
  notifWhat: "Co chceš sledovat:",
  notifEvents: "Nové akce",
  notifGallery: "Fotky",
  notifAudio: "Audio",
  notifVideo: "Videa",
  notifChannel: "Kanál:",
  notifChannels: "Kam zasílat (lze vybrat více):",
  notifEmail: "Email",
  notifSms: "SMS",
  notifTelegram: "Telegram",
  notifTgUser: "Telegram username",
  notifSaved: "✓ Uloženo",
  notifNote: "Odesílání notifikací bude aktivní po nasazení Cloud Functions.",

  // ─── Misc ───────────────────────────────────────
  embedBad: "Neplatná URL",
  soon: "SOON",
  photo: "foto",
  lightboxHint: "← → šipky · ESC zavřít",
  now: "teď",
  galNoEvent: "— bez přiřazení —",
};

// ─── Export ──────────────────────────────────────
// Změň `activeLocale` pro přepnutí jazyka
const locales = { cs };
let activeLocale = "cs";

export function setLocale(code) { if (locales[code]) activeLocale = code; }
export function getLocale() { return activeLocale; }

const S = new Proxy(cs, {
  get(_, key) { return (locales[activeLocale] || cs)[key] ?? cs[key] ?? key; }
});
export default S;
