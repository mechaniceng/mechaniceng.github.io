/* TiviEase Go — satın alma akışı (satin-al*.html)
   Plan kartlarından fiyatları prices.json ile bölgesel doldurur,
   "Satın Al" butonu checkout panelini açar, seçili ödeme sağlayıcının
   hosted checkout'unu başlatır.

   ÖDEME SAĞLAYICI: CHECKOUT.provider'ı doldur (aşağıda). Kart bilgileri
   hiçbir zaman sitemize gelmez — sağlayıcının hosted sayfasında girilir
   (PCI uyumu). Ödeme tamamlanınca sağlayıcı webhook'u Cloud Function'a
   gider → aktivasyon kodu üretilir → alıcıya e-posta gönderilir. */
(function () {
  'use strict';

  /* ══ ÖDEME SAĞLAYICI YAPILANDIRMASI ══
     provider = null        → "yapılandırılıyor" durumu gösterilir
     provider = 'paddle'    → Paddle.js overlay checkout (aşağıyı doldur)
     provider = 'iyzico'    → callable createIyzicoCheckout (backend gerekir) */
  var CHECKOUT = {
    provider: null,
    paddle: {
      env: 'sandbox',              // canlıda 'production'
      clientToken: '',             // Paddle → Developer Tools → Authentication → client-side token
      prices: {
        monthly:  '',              // pri_... (Paddle'da ürün fiyatı)
        annual:   '',
        lifetime: ''
      }
    }
    // iyzico: { } — iyzico checkout form sunucu taraflı; provider='iyzico'
    // yapınca createIyzicoCheckout callable'ı çağrılır (henüz yazılmadı).
  };

  var file = location.pathname.split('/').pop() || 'satin-al.html';
  var fm = file.match(/^(.+?)(?:\.([a-z]{2}))?\.html$/);
  var LANG = (fm && fm[2]) || 'tr';
  if (LANG !== 'en') LANG = 'tr';

  var S = {
    tr: {
      perMonth: '/ ay', perYear: '/ yıl', once: 'tek seferlik',
      payNow: 'Ödemeye Geç', email: 'E-posta adresiniz',
      emailHint: 'Aktivasyon kodu bu adrese gönderilecek',
      preparing: 'Ödeme sağlayıcı hazırlanıyor…',
      notReady: 'Online satın alma yakında aktif olacak. Şimdilik uygulama içinden Google Play ile satın alabilir veya aktivasyon kodu için bize yazabilirsiniz.',
      successTitle: 'Ödeme alındı!',
      successBody: 'Aktivasyon kodunuz e-posta adresinize gönderildi. Uygulamada Ayarlar → Premium → Aktivasyon Kodu ekranına girin.',
      orderSummary: 'Sipariş özeti',
      cancel: 'Vazgeç',
      invalidEmail: 'Geçerli bir e-posta girin.',
      errDefault: 'Ödeme başlatılamadı. Tekrar deneyin.'
    },
    en: {
      perMonth: '/ month', perYear: '/ year', once: 'one-time',
      payNow: 'Continue to Payment', email: 'Your email address',
      emailHint: 'The activation code will be sent to this address',
      preparing: 'Preparing checkout…',
      notReady: 'Online purchase is coming soon. For now, you can buy via Google Play inside the app or contact us for an activation code.',
      successTitle: 'Payment received!',
      successBody: 'Your activation code was emailed to you. In the app, enter it at Settings → Premium → Activation Code.',
      orderSummary: 'Order summary',
      cancel: 'Cancel',
      invalidEmail: 'Please enter a valid email.',
      errDefault: 'Could not start checkout. Please try again.'
    }
  }[LANG];

  var root = document.getElementById('buyApp');
  if (!root) return;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── Bölgesel fiyatları plan kartlarına yaz ── */
  var PLAN_SUFFIX = { monthly: S.perMonth, annual: S.perYear, yearly: S.perYear, lifetime: S.once };
  // prices.json 'annual' değil 'yearly' anahtarı kullanıyor
  var PRICE_KEY = { monthly: 'monthly', annual: 'yearly', lifetime: 'lifetime' };

  var regionEntry = null;
  function fillPrices() {
    if (!window.TiviPricing) return;
    TiviPricing.load().then(function (data) {
      regionEntry = TiviPricing.regionalEntry(data);
      if (!regionEntry) return;
      var locale = navigator.language || document.documentElement.lang || 'en';
      document.querySelectorAll('.plan-card[data-plan]').forEach(function (card) {
        var plan = card.getAttribute('data-plan');
        var p = regionEntry[PRICE_KEY[plan]];
        var el = card.querySelector('.plan-price');
        if (p && el) {
          el.innerHTML = esc(TiviPricing.formatPrice(p, locale)) +
            ' <small>' + esc(PLAN_SUFFIX[plan]) + '</small>';
        }
      });
    }).catch(function () {});
  }

  /* ── Checkout paneli ── */
  var selPlan = null;

  function planLabel(plan) {
    var card = document.querySelector('.plan-card[data-plan="' + plan + '"]');
    return card ? (card.querySelector('h3') || {}).textContent || plan : plan;
  }
  function planPriceText(plan) {
    var card = document.querySelector('.plan-card[data-plan="' + plan + '"]');
    var el = card && card.querySelector('.plan-price');
    return el ? el.textContent.trim() : '';
  }

  function openCheckout(plan) {
    selPlan = plan;
    $('ckPlan').textContent = planLabel(plan);
    $('ckAmount').textContent = planPriceText(plan);
    var u = window.TiviAuth && TiviAuth.currentUser ? TiviAuth.currentUser() : null;
    if (u && u.email && !$('ckEmail').value) $('ckEmail').value = u.email;
    $('ckPanel').hidden = false;
    $('ckSuccess').hidden = true;
    $('ckPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('ckMsg').textContent = '';
  }

  function setCkMsg(text) { $('ckMsg').textContent = text || ''; }

  function showSuccess() {
    $('ckPanel').hidden = true;
    $('ckSuccess').hidden = false;
    $('ckSuccess').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ── Sağlayıcı adapterları ── */

  // Paddle.js v2 (hosted overlay — kart alanları Paddle'a ait)
  var _paddleReady = null;
  function ensurePaddle() {
    if (_paddleReady) return _paddleReady;
    _paddleReady = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      s.onload = function () {
        try {
          if (CHECKOUT.paddle.env === 'sandbox') Paddle.Environment.set('sandbox');
          Paddle.Initialize({
            token: CHECKOUT.paddle.clientToken,
            eventCallback: function (ev) {
              if (ev && ev.name === 'checkout.completed') showSuccess();
            }
          });
          resolve();
        } catch (e) { reject(e); }
      };
      s.onerror = function () { reject(new Error('paddle.js yüklenemedi')); };
      document.head.appendChild(s);
    });
    return _paddleReady;
  }

  function providerConfigured() {
    if (CHECKOUT.provider === 'paddle') {
      return !!(CHECKOUT.paddle.clientToken && CHECKOUT.paddle.prices[selPlan]);
    }
    return false;
  }

  function pay() {
    var email = $('ckEmail').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setCkMsg(S.invalidEmail); return; }
    if (!providerConfigured()) { setCkMsg(S.notReady); return; }

    var btn = $('ckPay');
    btn.disabled = true; setCkMsg(S.preparing);

    var done = function () { btn.disabled = false; setCkMsg(''); };
    var fail = function () { btn.disabled = false; setCkMsg(S.errDefault); };

    if (CHECKOUT.provider === 'paddle') {
      ensurePaddle().then(function () {
        Paddle.Checkout.open({
          items: [{ priceId: CHECKOUT.paddle.prices[selPlan], quantity: 1 }],
          customer: { email: email },
          customData: { plan: selPlan, lang: LANG, email: email },
          settings: { displayMode: 'overlay', theme: 'dark', locale: LANG === 'tr' ? 'tr' : 'en' }
        });
        done();
      }).catch(fail);
    } else {
      fail();
    }
  }

  /* ── Bağlantılar ── */
  document.querySelectorAll('.plan-card .plan-buy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.plan-card');
      openCheckout(card.getAttribute('data-plan'));
    });
  });
  $('ckPay').addEventListener('click', pay);
  $('ckCancel').addEventListener('click', function () { $('ckPanel').hidden = true; });
  $('ckPay').textContent = S.payNow;
  $('ckCancel').textContent = S.cancel;
  $('ckSummaryLabel').textContent = S.orderSummary;
  $('ckEmailLabel').textContent = S.email;
  $('ckEmailHint').textContent = S.emailHint;
  var st = $('ckSuccessTitle'), sb = $('ckSuccessBody');
  if (st) st.textContent = S.successTitle;
  if (sb) sb.textContent = S.successBody;

  fillPrices();
})();
