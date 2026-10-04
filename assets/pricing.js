/* TiviEase Go — bölgesel premium fiyat gösterimi
   assets/prices.json (scripts/fetch_prices.js ile Play Developer API'den
   üretilir) içinden ziyaretçinin bölgesine uygun fiyatı seçer ve
   yardim sayfalarındaki premium fiyat tablosunu günceller.

   JSON yoksa, bölge tabloda yoksa veya fetch başarısızsa HTML'deki
   gömülü fiyatlar olduğu gibi kalır.

   Ayrıca window.TiviPricing API'sini sunar — checkout.js (satin-al
   sayfası) aynı bölge/format mantığını plan kartlarında kullanır. */
(function () {
  var PLAN_KEYS = ['monthly', 'yearly', 'lifetime'];

  // Bölge alt etiketi olmayan diller için varsayılan bölge
  var LANG_TO_REGION = {
    tr: 'TR', en: 'US', de: 'DE', fr: 'FR', es: 'ES', it: 'IT',
    pt: 'BR', nl: 'NL', ru: 'RU', uk: 'UA', pl: 'PL', cs: 'CZ',
    sv: 'SE', ar: 'SA', fa: 'IR', hi: 'IN', th: 'TH', zh: 'CN',
    ja: 'JP', ko: 'KR', az: 'AZ', id: 'ID', ms: 'MY', vi: 'VN'
  };

  function detectRegion() {
    var langs = navigator.languages || [navigator.language || ''];
    var i, l, m;
    // 1) açık bölge alt etiketi: en-US → US, pt-BR → BR
    for (i = 0; i < langs.length; i++) {
      l = langs[i] || '';
      if (/-hant/i.test(l)) return 'TW';
      m = l.match(/^[a-z]{2,3}[-_]([A-Za-z]{2}|[0-9]{3})\b/i);
      if (m) return m[1].toUpperCase();
    }
    // 2) Intl.Locale.maximize: tr → TR, zh → CN gibi çıkarım
    for (i = 0; i < langs.length; i++) {
      try {
        var r = new Intl.Locale(langs[i]).maximize().region;
        if (r) return r;
      } catch (e) { /* eski tarayıcı */ }
    }
    // 3) yalın dil kodu → varsayılan bölge
    for (i = 0; i < langs.length; i++) {
      var b = (langs[i] || '').split(/[-_]/)[0].toLowerCase();
      if (LANG_TO_REGION[b]) return LANG_TO_REGION[b];
    }
    return 'US';
  }

  function formatPrice(entry, locale) {
    var amount = Number(entry.micros) / 1e6;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: entry.currency
      }).format(amount);
    } catch (e) {
      return entry.currency + ' ' + amount.toFixed(2);
    }
  }

  var _loadPromise = null;
  function load() {
    if (!_loadPromise) {
      _loadPromise = fetch('assets/prices.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return _loadPromise;
  }

  // Ziyaretçi bölgesine ait {monthly,yearly,lifetime} fiyat seti (yoksa null)
  function regionalEntry(data) {
    var regions = data && data.regions;
    if (!regions) return null;
    return regions[detectRegion()] || regions.DEFAULT || null;
  }

  window.TiviPricing = {
    PLAN_KEYS: PLAN_KEYS,
    detectRegion: detectRegion,
    formatPrice: formatPrice,
    load: load,
    regionalEntry: regionalEntry
  };

  // ── Yardım sayfalarındaki premium tablosunu güncelle ──
  function apply(data) {
    var entry = regionalEntry(data);
    if (!entry) return;

    // h3#premium'dan sonraki İLK table.tbl — section içinde başka
    // h3+tablo blokları olduğu için section.querySelector kullanılamaz.
    var h3 = document.getElementById('premium');
    if (!h3) return;
    var table = null;
    for (var n = h3.nextElementSibling; n; n = n.nextElementSibling) {
      if (n.tagName === 'H2' || n.tagName === 'H3') break;
      if (n.tagName === 'TABLE') { table = n; break; }
      var inner = n.querySelector && n.querySelector('table.tbl');
      if (inner) { table = inner; break; }
    }
    if (!table) return;

    var locale = navigator.language || document.documentElement.lang || 'en';
    var rows = table.querySelectorAll('tr');
    for (var i = 0; i < PLAN_KEYS.length; i++) {
      var row = rows[i + 1]; // 0 = başlık satırı
      if (!row) break;
      var cell = row.querySelectorAll('td')[1];
      var p = entry[PLAN_KEYS[i]];
      if (!cell || !p) continue;
      // "₺9.99 / ay" → fiyat kısmını at, " / ay" sonekini koru
      var suffix = cell.textContent.replace(/^[^\d]*\d[\d.,]*/, '');
      cell.textContent = formatPrice(p, locale) + suffix;
    }
  }

  load().then(apply).catch(function () { /* gömülü fiyatlar kalır */ });
})();
