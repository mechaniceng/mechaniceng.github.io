/* TiviEase Go — hesap sayfası mantığı (hesap.html / hesap.en.html)
   auth.js'nin yüklediği Firebase Auth oturumunu kullanır.
   Lisans/cihaz verisi Firestore REST ile, cihaz kaldırma callable
   fonksiyonu REST ile çağrılır (ayrı Firestore/Functions SDK'si yok). */
(function () {
  'use strict';

  var root = document.getElementById('accApp');
  if (!root || !window.TiviAuth) return;

  var L = TiviAuth.lang === 'en' ? 'en' : 'tr';

  var S = {
    tr: {
      signInTitle: 'Hesabınıza giriş yapın',
      signUpTitle: 'Hesap oluşturun',
      signInBtn: 'Giriş Yap',
      signUpBtn: 'Kayıt Ol',
      toSignUp: 'Hesabınız yok mu? <a id="swLink">Kayıt olun</a>',
      toSignIn: 'Zaten hesabınız var mı? <a id="swLink">Giriş yapın</a>',
      or: 'veya',
      google: 'Google ile devam et',
      forgotSent: 'Şifre sıfırlama e-postası gönderildi.',
      resetSent: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
      nameSaved: 'İsim güncellendi.',
      tierFree: 'Ücretsiz', tierMonthly: 'Pro Aylık', tierAnnual: 'Pro Yıllık',
      tierLifetime: 'Pro Ömür Boyu', tierExpired: 'Süresi Dolmuş',
      expiresNever: 'Süresiz',
      noLicense: 'Henüz lisans kaydı yok — uygulamada giriş yapınca otomatik oluşur.',
      devicesCount: function (n, max) { return n + ' / ' + max + ' cihaz'; },
      noDevices: 'Kayıtlı cihaz yok. Cihazlar, uygulamada hesabınıza giriş yapınca eklenir.',
      deviceFallback: function (id) { return 'Cihaz ' + id.slice(-6); },
      remove: 'Kaldır',
      removeConfirm: function (name) { return '"' + name + '" cihazı hesabınızdan kaldırılsın mı?'; },
      removed: 'Cihaz kaldırıldı.',
      anon: 'Anonim oturum',
      errDefault: 'Bir hata oluştu. Tekrar deneyin.',
      err: {
        'auth/invalid-email': 'Geçersiz e-posta adresi.',
        'auth/user-not-found': 'Bu e-postayla kayıtlı hesap bulunamadı.',
        'auth/wrong-password': 'Şifre hatalı.',
        'auth/invalid-credential': 'E-posta veya şifre hatalı.',
        'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.',
        'auth/weak-password': 'Şifre çok zayıf — en az 6 karakter kullanın.',
        'auth/too-many-requests': 'Çok fazla deneme. Biraz bekleyip tekrar deneyin.',
        'auth/network-request-failed': 'Ağ hatası — bağlantınızı kontrol edin.',
        'auth/popup-closed-by-user': 'Google penceresi kapatıldı.',
        'auth/unauthorized-domain': 'Bu alan adı Firebase yetkili alanlarında tanımlı değil.',
        'auth/operation-not-allowed': 'Bu giriş yöntemi Firebase Console\'da etkin değil.'
      }
    },
    en: {
      signInTitle: 'Sign in to your account',
      signUpTitle: 'Create an account',
      signInBtn: 'Sign in',
      signUpBtn: 'Sign up',
      toSignUp: 'No account? <a id="swLink">Sign up</a>',
      toSignIn: 'Already have an account? <a id="swLink">Sign in</a>',
      or: 'or',
      google: 'Continue with Google',
      forgotSent: 'Password reset email sent.',
      resetSent: 'A password reset link was sent to your email.',
      nameSaved: 'Name updated.',
      tierFree: 'Free', tierMonthly: 'Pro Monthly', tierAnnual: 'Pro Annual',
      tierLifetime: 'Pro Lifetime', tierExpired: 'Expired',
      expiresNever: 'Never',
      noLicense: 'No license record yet — it is created automatically when you sign in inside the app.',
      devicesCount: function (n, max) { return n + ' / ' + max + ' devices'; },
      noDevices: 'No registered devices. Devices are added when you sign in on the app.',
      deviceFallback: function (id) { return 'Device ' + id.slice(-6); },
      remove: 'Remove',
      removeConfirm: function (name) { return 'Remove "' + name + '" from your account?'; },
      removed: 'Device removed.',
      anon: 'Anonymous session',
      errDefault: 'Something went wrong. Please try again.',
      err: {
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/email-already-in-use': 'This email is already registered. Try signing in.',
        'auth/weak-password': 'Password is too weak — use at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
        'auth/network-request-failed': 'Network error — check your connection.',
        'auth/popup-closed-by-user': 'Google popup was closed.',
        'auth/unauthorized-domain': 'This domain is not in Firebase authorized domains.',
        'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase Console.'
      }
    }
  }[L];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function errText(e) {
    var code = (e && e.code) || '';
    return S.err[code] || S.errDefault;
  }

  var mode = 'signin'; // 'signin' | 'signup'
  var currentUser = null;

  /* ── Görünüm geçişi ── */
  function showView(signedIn) {
    var loading = $('vLoading');
    if (loading) loading.hidden = true;
    $('vLogin').hidden = signedIn;
    $('vAccount').hidden = !signedIn;
  }

  function setMode(m) {
    mode = m;
    $('fTitle').textContent = m === 'signin' ? S.signInTitle : S.signUpTitle;
    $('fName').hidden = m === 'signin';
    $('btnAuth').textContent = m === 'signin' ? S.signInBtn : S.signUpBtn;
    $('swText').innerHTML = m === 'signin' ? S.toSignUp : S.toSignIn;
    $('linkForgot').style.display = m === 'signin' ? '' : 'none';
    $('swLink').addEventListener('click', function (e) {
      e.preventDefault();
      setMode(m === 'signin' ? 'signup' : 'signin');
    });
    setMsg('');
  }

  function setMsg(text, ok) {
    var el = $('accMsg');
    el.textContent = text || '';
    el.className = 'acc-msg' + (text ? (ok ? ' ok' : ' err') : '');
  }

  /* ── Kimlik işlemleri ── */
  function busy(b) {
    $('btnAuth').disabled = b;
    $('btnGoogle').disabled = b;
  }

  function submitAuth() {
    var email = $('inEmail').value.trim();
    var pass = $('inPass').value;
    if (!email || !pass) { setMsg(S.errDefault); return; }
    busy(true); setMsg('');
    var auth = firebase.auth();
    var p = mode === 'signin'
      ? auth.signInWithEmailAndPassword(email, pass)
      : auth.createUserWithEmailAndPassword(email, pass).then(function (cred) {
          var name = $('inName').value.trim();
          if (name) {
            return cred.user.updateProfile({ displayName: name }).then(function () {
              TiviAuth.refreshHeader();
              if (currentUser) renderProfile(currentUser);
            });
          }
        });
    p.catch(function (e) { setMsg(errText(e)); })
     .finally(function () { busy(false); });
  }

  function googleSignIn() {
    busy(true); setMsg('');
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(function (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request')) {
        return firebase.auth().signInWithRedirect(provider);
      }
      if (e && e.code !== 'auth/popup-closed-by-user') setMsg(errText(e));
    }).finally(function () { busy(false); });
  }

  function forgotPass() {
    var email = $('inEmail').value.trim() || (currentUser && currentUser.email) || '';
    if (!email) { setMsg(S.err['auth/invalid-email']); return; }
    firebase.auth().sendPasswordResetEmail(email)
      .then(function () { setMsg(S.forgotSent, true); })
      .catch(function (e) { setMsg(errText(e)); });
  }

  /* ── Firestore REST: premium_licenses/{uid} ── */
  function fval(v) {
    if (!v) return null;
    if (v.stringValue !== undefined) return v.stringValue;
    if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
    if (v.doubleValue !== undefined) return v.doubleValue;
    if (v.booleanValue !== undefined) return v.booleanValue;
    if (v.timestampValue !== undefined) return v.timestampValue;
    if (v.nullValue !== undefined) return null;
    if (v.arrayValue) return (v.arrayValue.values || []).map(fval);
    if (v.mapValue) {
      var o = {}, f = v.mapValue.fields || {};
      for (var k in f) o[k] = fval(f[k]);
      return o;
    }
    return null;
  }

  function fetchLicense(user) {
    return user.getIdToken().then(function (tok) {
      var url = 'https://firestore.googleapis.com/v1/projects/' +
        'tivi-ease-go/databases/(default)/documents/premium_licenses/' +
        encodeURIComponent(user.uid);
      return fetch(url, { headers: { Authorization: 'Bearer ' + tok } });
    }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('license ' + r.status);
      return r.json();
    }).then(function (doc) {
      if (!doc || !doc.fields) return null;
      var o = {};
      for (var k in doc.fields) o[k] = fval(doc.fields[k]);
      return o;
    });
  }

  function removeDevice(user, deviceId) {
    return user.getIdToken().then(function (tok) {
      return fetch('https://europe-west1-tivi-ease-go.cloudfunctions.net/removeDevice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ data: { deviceIdToRemove: deviceId } })
      });
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || j.error) throw new Error((j.error && j.error.message) || ('http ' + r.status));
        return j.result;
      });
    });
  }

  /* ── Hesap görünümü ── */
  function firstString(v) {
    if (typeof v === 'string' && v) return v;
    if (v && typeof v === 'object') {
      for (var k in v) { var r = firstString(v[k]); if (r) return r; }
    }
    return null;
  }

  var TIER_MAX = { free: 1, monthly: 1, annual: 1, lifetime: 5 };
  var TIER_LABEL = {
    free: S.tierFree, monthly: S.tierMonthly,
    annual: S.tierAnnual, lifetime: S.tierLifetime
  };

  function renderProfile(u) {
    var av = $('pAvatar');
    if (u.photoURL) {
      av.innerHTML = '<img class="auth-avatar" src="' + esc(u.photoURL) + '" alt="" referrerpolicy="no-referrer" style="width:56px;height:56px">';
    } else {
      var ch = ((u.displayName || u.email) || '?').trim().charAt(0).toUpperCase();
      av.innerHTML = '<span class="auth-avatar auth-initial" style="width:56px;height:56px;font-size:22px">' + esc(ch) + '</span>';
    }
    $('pName').textContent = u.displayName || (u.isAnonymous ? S.anon : (u.email || ''));
    $('pEmail').textContent = u.email || (u.isAnonymous ? S.anon : '');
    $('pUid').textContent = u.uid;
    $('inDispName').value = u.displayName || '';

    // Şifre sıfırlama sadece e-posta/şifre sağlayıcısı bağlıysa anlamlı
    var hasPw = (u.providerData || []).some(function (p) { return p.providerId === 'password'; });
    $('rowPassReset').style.display = hasPw ? '' : 'none';
  }

  function renderLicense(lic) {
    var badge = $('licTier');
    var tier = (lic && lic.tier) || 'free';
    var exp = lic && lic.expiresAt;
    var expired = !!(exp && tier !== 'lifetime' && new Date(exp).getTime() < Date.now());
    var effTier = expired ? 'free' : tier;

    badge.textContent = expired ? S.tierExpired : (TIER_LABEL[tier] || S.tierFree);
    badge.className = 'tier-badge ' + (expired ? 'expired' : (effTier === 'free' ? 'free' : 'pro'));

    $('licExp').textContent =
      !exp ? S.expiresNever : new Date(exp).toLocaleDateString(L === 'tr' ? 'tr-TR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    var devices = (lic && lic.devices) || [];
    var names = (lic && lic.deviceNames) || {};
    var max = (lic && lic.maxDevicesOverride > 0) ? lic.maxDevicesOverride
      : (TIER_MAX[effTier] || 1);

    $('licDev').textContent = S.devicesCount(devices.length, max);
    renderDevices(devices, names);
  }

  function renderDevices(devices, names) {
    var box = $('devRows');
    box.innerHTML = '';
    if (!devices.length) {
      box.innerHTML = '<div class="dev-empty">' + esc(S.noDevices) + '</div>';
      return;
    }
    devices.forEach(function (id) {
      id = String(id);
      var base = id.indexOf('.') > 0 ? id.slice(0, id.indexOf('.')) : id;
      var name = firstString(names[base]) || firstString(names[id]) || S.deviceFallback(id);

      var row = document.createElement('div');
      row.className = 'dev-row';
      row.innerHTML =
        '<div class="dev-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8"/></svg></div>' +
        '<div class="grow"><div class="dev-name">' + esc(name) + '</div>' +
        '<div class="dev-id">' + esc(id) + '</div></div>';
      var btn = document.createElement('button');
      btn.className = 'acc-btn danger sm';
      btn.textContent = S.remove;
      btn.addEventListener('click', function () {
        if (!confirm(S.removeConfirm(name))) return;
        btn.disabled = true;
        removeDevice(currentUser, id).then(function () {
          return loadLicense(true);
        }).catch(function () {
          btn.disabled = false;
          setMsg(S.errDefault);
        });
      });
      row.appendChild(btn);
      box.appendChild(row);
    });
  }

  var _licLoading = false;
  function loadLicense(silent) {
    if (_licLoading) return Promise.resolve();
    _licLoading = true;
    if (!silent) $('devRows').innerHTML = '<div class="acc-loading">…</div>';
    return fetchLicense(currentUser).then(function (lic) {
      renderLicense(lic);
      if (!lic) $('licExp').textContent = S.noLicense;
    }).catch(function () {
      $('devRows').innerHTML = '<div class="dev-empty">' + esc(S.errDefault) + '</div>';
    }).finally(function () { _licLoading = false; });
  }

  /* ── Akış ── */
  setMode('signin'); // başlangıç metinleri + swLink bağlantısı
  TiviAuth.ensureSdk().then(function () {
    firebase.auth().getRedirectResult().catch(function (e) {
      if (e && e.code) setMsg(errText(e));
    });
    firebase.auth().onAuthStateChanged(function (u) {
      currentUser = u;
      if (u) {
        showView(true);
        renderProfile(u);
        loadLicense();
      } else {
        showView(false);
        setMode(mode);
      }
    });
  }).catch(function () {
    showView(false);
    setMsg(S.errDefault);
  });

  $('btnGoogle').addEventListener('click', googleSignIn);
  $('linkForgot').addEventListener('click', function (e) { e.preventDefault(); forgotPass(); });
  $('authForm').addEventListener('submit', function (e) { e.preventDefault(); submitAuth(); });

  $('btnSaveName').addEventListener('click', function () {
    var name = $('inDispName').value.trim();
    if (!name || !currentUser) return;
    $('btnSaveName').disabled = true;
    currentUser.updateProfile({ displayName: name }).then(function () {
      renderProfile(currentUser);
      TiviAuth.refreshHeader();
      $('nameMsg').textContent = S.nameSaved;
      $('nameMsg').className = 'acc-msg ok';
    }).catch(function (e) {
      $('nameMsg').textContent = errText(e);
      $('nameMsg').className = 'acc-msg err';
    }).finally(function () { $('btnSaveName').disabled = false; });
  });

  $('btnPassReset').addEventListener('click', function () {
    if (!currentUser || !currentUser.email) return;
    firebase.auth().sendPasswordResetEmail(currentUser.email)
      .then(function () {
        $('passMsg').textContent = S.resetSent;
        $('passMsg').className = 'acc-msg ok';
      })
      .catch(function (e) {
        $('passMsg').textContent = errText(e);
        $('passMsg').className = 'acc-msg err';
      });
  });

  $('btnSignOut2').addEventListener('click', function () {
    TiviAuth.signOut();
  });
})();
