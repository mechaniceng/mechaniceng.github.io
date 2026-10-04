/* TiviEase Go — site kimlik doğrulama (Firebase Auth)
   Tüm sayfalarda üst bara "Giriş" butonu / kullanıcı avatar menüsü ekler.
   hesap*.html sayfaları window.TiviAuth üzerinden aynı oturumu kullanır.

   KURULUM NOTU: apiKey gizli değildir (Firebase istemci config'i herkese
   açık bilgidir; asıl güvenlik Firestore kuralları + App Check'tir).
   Bu key google-services.json'daki Android anahtarıdır — Google Cloud
   Console'da "Android uygulamaları" kısıtlaması varsa tarayıcıdan
   gelen istekler reddedilir; o durumda Firebase Console → Proje ayarları
   → Web uygulaması ekle ve web apiKey + appId'yi buraya yaz.
   Canlı alan adı için ayrıca: Authentication → Settings →
   Authorized domains listesine sitenin domain'i eklenmelidir
   (localhost varsayılan olarak izinlidir). */
(function () {
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDHR3BfAoD7B2dqgis54kxYd9IFFl3jOYE',
    authDomain: 'tivi-ease-go.firebaseapp.com',
    projectId: 'tivi-ease-go',
    storageBucket: 'tivi-ease-go.firebasestorage.app'
    // appId: '1:639151331620:web:…'  // web uygulaması eklenirse buraya
  };

  var SDK_VER = '10.14.1';
  var SDK_BASE = 'https://www.gstatic.com/firebasejs/' + SDK_VER + '/';
  var CACHE_KEY = 'tiviease.webuser';

  /* ── Dil: dosya adından (<sayfa>.<dil>.html) — hesap sayfası tr/en ── */
  var file = location.pathname.split('/').pop() || 'index.html';
  var fm = file.match(/^(.+?)(?:\.([a-z]{2}))?\.html$/);
  var LANG = (fm && fm[2]) || 'tr';

  var STR = {
    tr: { login: 'Giriş Yap', account: 'Hesabım', logout: 'Çıkış Yap' },
    en: { login: 'Sign in', account: 'My Account', logout: 'Sign out' },
    de: { login: 'Anmelden', account: 'Mein Konto', logout: 'Abmelden' },
    fr: { login: 'Se connecter', account: 'Mon compte', logout: 'Se déconnecter' },
    es: { login: 'Iniciar sesión', account: 'Mi cuenta', logout: 'Cerrar sesión' },
    it: { login: 'Accedi', account: 'Il mio account', logout: 'Esci' },
    pt: { login: 'Entrar', account: 'Minha conta', logout: 'Sair' },
    nl: { login: 'Inloggen', account: 'Mijn account', logout: 'Uitloggen' },
    ru: { login: 'Войти', account: 'Мой аккаунт', logout: 'Выйти' },
    uk: { login: 'Увійти', account: 'Мій обліковий запис', logout: 'Вийти' },
    pl: { login: 'Zaloguj się', account: 'Moje konto', logout: 'Wyloguj się' },
    cs: { login: 'Přihlásit se', account: 'Můj účet', logout: 'Odhlásit se' },
    sv: { login: 'Logga in', account: 'Mitt konto', logout: 'Logga ut' },
    ar: { login: 'تسجيل الدخول', account: 'حسابي', logout: 'تسجيل الخروج' },
    fa: { login: 'ورود', account: 'حساب من', logout: 'خروج' },
    hi: { login: 'साइन इन करें', account: 'मेरा खाता', logout: 'साइन आउट' },
    th: { login: 'เข้าสู่ระบบ', account: 'บัญชีของฉัน', logout: 'ออกจากระบบ' },
    zh: { login: '登录', account: '我的账户', logout: '退出登录' },
    ja: { login: 'ログイン', account: 'マイアカウント', logout: 'ログアウト' },
    ko: { login: '로그인', account: '내 계정', logout: '로그아웃' },
    az: { login: 'Daxil ol', account: 'Hesabım', logout: 'Çıxış' },
    id: { login: 'Masuk', account: 'Akun saya', logout: 'Keluar' },
    ms: { login: 'Log masuk', account: 'Akaun saya', logout: 'Log keluar' },
    vi: { login: 'Đăng nhập', account: 'Tài khoản của tôi', logout: 'Đăng xuất' }
  };
  var t = STR[LANG] || STR.tr;

  function accountHref() {
    return LANG === 'tr' ? 'hesap.html' : 'hesap.en.html';
  }

  /* ── Firebase SDK'yi istendiğinde yükle (compat build'ler) ── */
  var _sdkPromise = null;
  function loadSdk() {
    if (_sdkPromise) return _sdkPromise;
    _sdkPromise = new Promise(function (resolve, reject) {
      var srcs = ['firebase-app-compat.js', 'firebase-auth-compat.js'];
      (function next(i) {
        if (i >= srcs.length) {
          try {
            firebase.initializeApp(FIREBASE_CONFIG);
            resolve();
          } catch (e) { reject(e); }
          return;
        }
        var s = document.createElement('script');
        s.src = SDK_BASE + srcs[i];
        s.onload = function () { next(i + 1); };
        s.onerror = function () { reject(new Error('SDK yüklenemedi: ' + srcs[i])); };
        document.head.appendChild(s);
      })(0);
    });
    return _sdkPromise;
  }

  /* ── Oturum durumu ── */
  var _user = undefined;          // undefined = henüz bilinmiyor
  var _waiters = [];

  function setUser(u) {
    _user = u;
    // Header widget'ını güncelle + hafif önbelleği tazele
    renderSlot(u);
    try {
      if (u) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          name: u.displayName || '', email: u.email || '', photo: u.photoURL || ''
        }));
      } else {
        localStorage.removeItem(CACHE_KEY);
      }
    } catch (e) {}
    _waiters.forEach(function (fn) { fn(u); });
    _waiters = [];
  }

  loadSdk().then(function () {
    firebase.auth().onAuthStateChanged(function (u) { setUser(u || null); });
  }).catch(function () {
    // SDK/anahtar sorunu — önbellek varsa onu göster, yoksa giriş butonu
    setUser(_cachedUser());
  });

  function _cachedUser() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return c ? { displayName: c.name, email: c.email, photoURL: c.photo } : null;
    } catch (e) { return null; }
  }

  /* ── Header widget ── */
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function avatarHtml(u) {
    if (u && u.photoURL) {
      return '<img class="auth-avatar" src="' + esc(u.photoURL) + '" alt="" referrerpolicy="no-referrer">';
    }
    var ch = ((u && (u.displayName || u.email)) || '?').trim().charAt(0).toUpperCase();
    return '<span class="auth-avatar auth-initial">' + esc(ch) + '</span>';
  }

  var slot = null;
  function renderSlot(u) {
    if (!slot) return;
    if (!u) {
      slot.innerHTML = '<a class="auth-login" href="' + accountHref() + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="15" height="15"><path d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>' +
        esc(t.login) + '</a>';
      return;
    }
    slot.innerHTML =
      '<div class="auth-picker" id="authPicker">' +
        '<button type="button" class="auth-user-btn" aria-label="' + esc(t.account) + '">' +
          avatarHtml(u) +
        '</button>' +
        '<div class="auth-menu">' +
          '<div class="auth-menu-head">' +
            '<div class="auth-menu-name">' + esc(u.displayName || u.email || '') + '</div>' +
            (u.displayName && u.email ? '<div class="auth-menu-mail">' + esc(u.email) + '</div>' : '') +
          '</div>' +
          '<a class="auth-item" href="' + accountHref() + '">' + esc(t.account) + '</a>' +
          '<button type="button" class="auth-item auth-out" id="authSignOut">' + esc(t.logout) + '</button>' +
        '</div>' +
      '</div>';

    var picker = document.getElementById('authPicker');
    var btn = picker.querySelector('.auth-user-btn');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      picker.classList.toggle('open');
    });
    document.getElementById('authSignOut').addEventListener('click', function () {
      TiviAuth.signOut().catch(function () {
        try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      }).then(function () { location.reload(); });
    });
  }

  function mountSlot() {
    var inner = document.querySelector('.site-header-inner');
    if (!inner) return;
    slot = document.createElement('div');
    slot.className = 'auth-slot';
    inner.appendChild(slot);
    // Önce önbellekli profili boya (SDK çözülmeden), sonra gerçek durum gelir
    renderSlot(_user !== undefined ? _user : _cachedUser());
  }

  document.addEventListener('click', function (e) {
    var p = document.getElementById('authPicker');
    if (p && !p.contains(e.target)) p.classList.remove('open');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var p = document.getElementById('authPicker');
      if (p) p.classList.remove('open');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountSlot);
  } else {
    mountSlot();
  }

  /* ── Hesap sayfası API'si ── */
  window.TiviAuth = {
    lang: LANG,
    t: t,
    accountHref: accountHref,
    ensureSdk: loadSdk,
    auth: function () { return firebase.auth(); },
    whenReady: function (fn) {
      if (_user !== undefined) fn(_user);
      else _waiters.push(fn);
    },
    signOut: function () {
      return loadSdk().then(function () { return firebase.auth().signOut(); });
    },
    // Çözülmüş kullanıcı (henüz bilinmiyorsa null)
    currentUser: function () {
      try {
        var u = firebase.auth().currentUser;
        if (u) return u;
      } catch (e) {}
      return _user || null;
    },
    // Profil (displayName/photoURL) güncellendiğinde header + önbelleği tazeler
    refreshHeader: function () {
      try {
        var u = firebase.auth().currentUser;
        if (u) setUser(u);
      } catch (e) {}
    }
  };
})();
