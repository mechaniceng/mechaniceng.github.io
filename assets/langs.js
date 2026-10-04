/* TiviEase Go — site dil seçici
   Dosya adı kuralı: <sayfa>.html (Türkçe) | <sayfa>.<dil>.html (diğerleri)
   Örn: index.en.html, yardim.de.html */
(function () {
  var LANGS = [
    { c: 'tr', n: 'Türkçe',          f: '🇹🇷' },
    { c: 'en', n: 'English',         f: '🇬🇧' },
    { c: 'de', n: 'Deutsch',         f: '🇩🇪' },
    { c: 'fr', n: 'Français',        f: '🇫🇷' },
    { c: 'es', n: 'Español',         f: '🇪🇸' },
    { c: 'it', n: 'Italiano',        f: '🇮🇹' },
    { c: 'pt', n: 'Português',       f: '🇧🇷' },
    { c: 'nl', n: 'Nederlands',      f: '🇳🇱' },
    { c: 'ru', n: 'Русский',         f: '🇷🇺' },
    { c: 'uk', n: 'Українська',      f: '🇺🇦' },
    { c: 'pl', n: 'Polski',          f: '🇵🇱' },
    { c: 'cs', n: 'Čeština',         f: '🇨🇿' },
    { c: 'sv', n: 'Svenska',         f: '🇸🇪' },
    { c: 'ar', n: 'العربية',         f: '🇸🇦', rtl: true },
    { c: 'fa', n: 'فارسی',           f: '🇮🇷', rtl: true },
    { c: 'hi', n: 'हिन्दी',            f: '🇮🇳' },
    { c: 'th', n: 'ไทย',             f: '🇹🇭' },
    { c: 'zh', n: '中文',             f: '🇨🇳' },
    { c: 'ja', n: '日本語',           f: '🇯🇵' },
    { c: 'ko', n: '한국어',           f: '🇰🇷' },
    { c: 'az', n: 'Azərbaycan',      f: '🇦🇿' },
    { c: 'id', n: 'Bahasa Indonesia', f: '🇮🇩' },
    { c: 'ms', n: 'Bahasa Melayu',   f: '🇲🇾' },
    { c: 'vi', n: 'Tiếng Việt',      f: '🇻🇳' }
  ];

  // Sayfa bazlı dil sınırlama: <meta name="tiviease-langs" content="tr,en">
  // varsa seçici ve otomatik yönlendirme sadece bu dillerde çalışır
  // (ör. hesap sayfası sadece tr/en — diğer dillere tıklayan 404 almasın).
  var metaLangs = document.querySelector('meta[name="tiviease-langs"]');
  if (metaLangs) {
    var allowed = (metaLangs.getAttribute('content') || '')
      .split(',').map(function (s) { return s.trim(); });
    LANGS = LANGS.filter(function (l) { return allowed.indexOf(l.c) >= 0; });
  }

  var file = location.pathname.split('/').pop() || 'index.html';
  var m = file.match(/^(.+?)(?:\.([a-z]{2}))?\.html$/);
  var base = m ? m[1] : 'index';
  var cur  = (m && m[2]) || 'tr';

  function hrefFor(code) {
    return code === 'tr' ? base + '.html' : base + '.' + code + '.html';
  }

  // ── Otomatik dil: hatırlanan seçim > sistem dili ──
  // Sistem diline ait dosya varsa o sayfaya yönlendir; çevirisi yoksa
  // mevcut sayfada kal. Test/geliştirme için ?nolang atlatır.
  var STORE_KEY = 'tiviease.lang';
  var known = function (c) {
    return LANGS.some(function (l) { return l.c === c; });
  };
  var wanted = null;
  try { wanted = localStorage.getItem(STORE_KEY); } catch (e) {}
  if (!wanted || !known(wanted)) {
    wanted = null;
    var nav = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < nav.length && !wanted; i++) {
      var b = (nav[i] || '').split(/[-_]/)[0].toLowerCase();
      if (known(b)) wanted = b;
    }
    // Sistem dili listede yoksa varsayılan: İngilizce
    if (!wanted) wanted = 'en';
  }
  // Hedef dosya yoksa İngilizce'ye düş (ör. zh listede var ama
  // çevirisi henüz eklenmemişse); İngilizce de yoksa mevcut sayfada kal.
  function tryRedirect(code, fallbackToEn) {
    if (code === cur) return;
    var target = hrefFor(code);
    fetch(target, { method: 'HEAD' })
      .then(function (r) {
        if (r.ok) {
          location.replace(target + location.search + location.hash);
        } else if (fallbackToEn) {
          tryRedirect('en', false);
        }
      })
      .catch(function () {});
  }
  if (wanted && !/[?&]nolang\b/.test(location.search)) {
    tryRedirect(wanted, wanted !== 'en');
  }

  // ── D-picker DOM ──
  var host = document.getElementById('langPicker');
  if (!host) return;
  host.className = 'lang-picker';

  var curLang = LANGS.filter(function (l) { return l.c === cur; })[0] || LANGS[0];

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'lang-btn';
  btn.setAttribute('aria-label', 'Dil / Language');
  btn.innerHTML = '<span class="lg-flag">' + curLang.f + '</span><span class="lg-code">' + curLang.c.toUpperCase() + '</span><span class="caret">▾</span>';

  var menu = document.createElement('div');
  menu.className = 'lang-menu';
  LANGS.forEach(function (l) {
    var a = document.createElement('a');
    a.href = hrefFor(l.c);
    a.className = 'lang-item' + (l.c === cur ? ' active' : '');
    a.innerHTML = '<span class="lg-flag">' + l.f + '</span>' + l.n;
    a.addEventListener('click', function () {
      try { localStorage.setItem(STORE_KEY, l.c); } catch (e) {}
    });
    menu.appendChild(a);
  });

  host.appendChild(btn);
  host.appendChild(menu);

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    host.classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    if (!host.contains(e.target)) host.classList.remove('open');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') host.classList.remove('open');
  });
})();

/* TiviEase Go — hero TV ekran döngüsü
   .tv-frame bulunan sayfalarda (index.*) .tv-body içeriğini gerçek
   uygulama ekran görüntülerinden oluşan slayt gösterisine çevirir
   (assets/screens/). 5sn bekle → sola kayar, sonsuz döngü. */
(function () {
  var body = document.querySelector('.tv-frame .tv-body');
  if (!body) return;

  var SLIDE_MS = 5000;
  var SHOTS = [
    {f:'screen-epg.png'},            // TV rehberi
    {f:'phone-channels.png', ph:1},  // telefon: kanal listesi
    {f:'screen-movies.png'},         // filmler
    {f:'phone-movies.png', ph:1},    // telefon: film grid
    {f:'screen-series.jpg'},         // diziler
    {f:'phone-vod.png', ph:1},       // telefon: VOD detay
    {f:'screen-series-detail.jpg'},  // dizi detay
    {f:'phone-vod-similar.png', ph:1}, // telefon: benzer icerik + oyuncular
    {f:'screen-search.png'},         // arama
    {f:'phone-epg.png', ph:1}        // telefon: EPG gun listesi
  ];

  function el(tag, cls, parent) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (parent) parent.appendChild(d);
    return d;
  }

  var track = el('div', 'tv-track');
  body.textContent = ''; // sembolik EPG mockup yerine gerçek ekranlar
  SHOTS.forEach(function (sh) {
    var s = el('div', 'tv-slide' + (sh.ph ? ' tv-slide--phone' : ''), track);
    var img = el('img', 'tvs-shot', s);
    img.src = 'assets/screens/' + sh.f;
    img.alt = '';
  });
  // Setin tamamı bir kez çiftlenir — pos bir set genişliği kadar
  // kayınca başa sarılır, izleyici fark etmez (kesintisiz döngü)
  var n = SHOTS.length;
  for (var k = 0; k < n; k++) track.appendChild(track.children[k].cloneNode(true));
  body.appendChild(track);
  track.classList.add('noanim'); // rAF her karede yazar — CSS transition kapalı

  var SPEED = 55; // px/sn
  var setW = 0;
  var pos = 0;
  var last = 0;

  function measure() {
    // ikinci setin ilk slaytının konumu = bir set genişliği (gap dahil)
    setW = track.children[n].offsetLeft - track.children[0].offsetLeft;
    if (pos <= -setW) pos += Math.ceil(-pos / setW) * setW;
    if (pos > 0) pos -= Math.ceil(pos / setW) * setW;
    track.style.transform = 'translateX(' + pos + 'px)';
  }

  function tick(ts) {
    if (last && setW) {
      pos -= SPEED * (ts - last) / 1000;
      while (pos <= -setW) pos += setW;
      track.style.transform = 'translateX(' + pos + 'px)';
    }
    last = ts;
    requestAnimationFrame(tick);
  }

  // Açılışta ilk slaytı ortala, sonra sürekli kaydır
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  measure();
  pos = body.clientWidth / 2 - track.children[0].offsetWidth / 2;
  measure();
  requestAnimationFrame(tick);
})();

/* TiviEase Go — indirme butonlarında sürüm rozeti
   .dl-apk, .dl-amazon ve .dl-win butonları releases/latest/download'a işaret ettiği
   için GitHub API'den latest release'in tag'ini (v<x.y.z>) çekip buton
   metinlerinin sağına (2 boşlukla) yazar. Fetch başarısızsa butonlar
   değişmez. */
(function () {
  var btns = document.querySelectorAll('.dl-btn.dl-apk, .dl-btn.dl-win, .dl-btn.dl-amazon');
  if (!btns.length || !window.fetch) return;

  fetch('https://api.github.com/repos/mechaniceng/tiviease-downloads/releases/latest')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (rel) {
      var tag = rel && rel.tag_name;
      if (!tag) return;
      Array.prototype.forEach.call(btns, function (btn) {
        // bitisik bosluklar white-space:normal'da teke duser - 2 karakter icin nbsp
        btn.appendChild(document.createTextNode('  '));
        var ver = document.createElement('span');
        ver.className = 'dl-ver';
        ver.textContent = tag;
        btn.appendChild(ver);
      });
    })
    .catch(function () {});
})();


// ===== 4) Hero baslik rotatoru (h1 ikinci satir, diline gore donusumlu) =====
(function(){
  var el=document.querySelector('.hero .h1-rot');
  if(!el) return;
  var lang=(document.documentElement.lang||'tr').toLowerCase();
  var P={
    tr:['sadeleştirin.','yeniden keşfedin.','zirveye taşıyın.','kişiselleştirin.'],
    en:['IPTV experience.','IPTV journey.','entertainment setup.','viewing routine.'],
    de:['IPTV-Erlebnis.','IPTV-Reise.','Fernsehvergnügen.','Streaming-Setup.'],
    fr:['expérience IPTV.','univers IPTV.','routine TV.','streaming quotidien.'],
    es:['experiencia IPTV.','mundo IPTV.','rutina de TV.','forma de ver TV.'],
    it:['esperienza IPTV.','visione IPTV.','intrattenimento TV.','quotidiano IPTV.'],
    pt:['experiência IPTV.','universo IPTV.','rotina de TV.','streaming diário.'],
    nl:['IPTV-ervaring.','IPTV-reis.','tv-routine.','kijkplezier.'],
    sv:['IPTV-upplevelse.','TV-vardag.','underhållning.','tittarstund.'],
    pl:['doświadczenie IPTV.','oglądanie IPTV.','doświadczenie TV.','strumieniowanie.'],
    cs:['IPTV zážitek.','IPTV svět.','sledování TV.','zábavu.'],
    ru:['IPTV-опыт.','IPTV-мир.','просмотр ТВ.','развлечения.'],
    uk:['IPTV-досвід.','IPTV-світ.','перегляд ТВ.','розваги.'],
    ar:['IPTV الخاصة بك.','رحلتك التلفزيونية.','عالم الترفيه.','مشاهدتك اليومية.'],
    fa:['ساده کنید.','یکپارچه کنید.','نوسازی کنید.','شخصی‌سازی کنید.'],
    az:['aslaşdırın.','yeniləyin.','təkmilləşdirin.','şıklaşdırın.'],
    hi:['आसान बनाएँ।','नया बनाएँ।','बेहतर बनाएँ।','खास बनाएँ।'],
    id:['IPTV Anda.','TV Anda.','hiburan Anda.','keseharian Anda.'],
    ms:['IPTV anda.','TV anda.','hiburan anda.','tontonan anda.'],
    ja:['もっとかんたんに。','もっと自由に。','もっとスマートに。','もっと楽しく。'],
    ko:['더 쉽게.','더 스마트하게.','더 자유롭게.','더 즐겁게.'],
    zh:['更加轻松。','更加智能。','更加自由。','焕然一新。'],
    th:['ของคุณง่ายขึ้น','ของคุณสนุกขึ้น','ของคุณทันสมัยขึ้น','ของคุณพิเศษขึ้น'],
    vi:['IPTV của bạn.','giải trí của bạn.','xem TV của bạn.','thư giãn của bạn.']
  };
  var list=P[lang]||P.en;
  if(list.length<2) return;
  var i=0;
  function tick(){
    el.classList.add('h1-swap');
    setTimeout(function(){
      i=(i+1)%list.length;
      el.textContent=list[i];
      el.classList.remove('h1-swap');
    },450);
  }
  setTimeout(function(){ setInterval(tick,4800); },2500);
})();

// ===== 5) Hero aciklama rotatoru (lead paragraf, diline gore 8 varyant) =====
(function(){
  var el=document.querySelector('.hero .lead-rot');
  if(!el) return;
  var lang=(document.documentElement.lang||'tr').toLowerCase();
  var P={
    tr:[
      'TiviEase Go; M3U ve Xtream Codes listelerinizi tek uygulamada toplar. Canlı TV rehberi, film & dizi arşivi, kayıt, hatırlatıcı ve çoklu ekran — hepsi kumandayla kolayca yönetilir.',
      'Kanallarınız, filmleriniz ve dizileriniz tek çatı altında. Otomatik dil ve altyazı tespiti, kişisel listeler ve bulut senkronizasyonuyla televizyonunuz hep sizinle.',
      'Kumandaya alışkın ellere göre tasarlandı. Hızlı kanal geçişleri, akıllı arama ve favoriler — büyük ekranda akıcı bir IPTV deneyimi.',
      'Kayıt alın, hatırlatıcı kurun, aynı anda birden fazla yayını izleyin. Çoklu ekran ve EPG ile hiçbir programı kaçırmayın.',
      'Listeleriniz Android telefondan TV\u2019ye, Windows\u2019tan Fire TV\u2019ye senkronize. Nerede kaldıysanız oradan devam edin — kurulum bir kez, keyif her yerde.',
      'Herkes kendi profilini açar — izleme listeleri, favoriler ve kaldığı yer ayrı tutulur. PIN korumalı ebeveyn kontrolü ve yaş grubu filtreleriyle çocuklar güvende.',
      'Film ve bölümleri indirin, internet olmadan izleyin. İndirmeler cihazınızda saklanır — yolda, tatilde, bağlantı kesildiğinde bile arşiviniz yanınızda.',
      'Favorilere ekleyin, kaldığınız yerden devam edin, kendi listenizi kurun. Akıllı arama kanal, film ve diziyi saniyeler içinde önünüze getirir.',
      'Kontrol tamamen sizde — aboneliğinizi, bağlı cihazlarınızı ve hesap ayarlarınızı web hesabınızdan yönetin. Cihaz ekleyip çıkarın, değişiklikler anında tüm ekranlarınıza yansır.',
      'Aramak çocuk oyuncağı — oyuncu adı, yapım yılı, tür veya başlıktan tek bir kelime yeterli. Zenginleştirilmiş medya verileri tüm arşivi tarar ve saniyeler içinde doğru sonucu bulur.'
    ],
    en:[
      'TiviEase Go brings your M3U and Xtream Codes playlists into one app. Live TV guide, movie & series library, recording, reminders and multi-screen — all easily managed with your remote.',
      'Your channels, movies and series under one roof. Automatic audio and subtitle detection, personal lists and cloud sync keep your TV with you.',
      'Designed for remote-happy hands. Fast channel zapping, smart search and favourites — a fluid IPTV experience on the big screen.',
      'Record, set reminders, watch several streams at once. Multi-screen and EPG mean you never miss a broadcast.',
      'Your playlists sync from Android phone to TV, Windows to Fire TV. Pick up where you left off — set up once, enjoy everywhere.',
      'Everyone gets their own profile — separate watchlists, favourites and resume points. PIN-protected parental controls and age ratings keep kids safe.',
      'Download movies and episodes to watch offline. Your library travels with you — on the road, on holiday, even without a connection.',
      'Add favourites, resume where you left off, build your own list. Smart search puts channels, movies and series in front of you in seconds.',
      'You\u2019re in full control — manage your subscription, linked devices and account settings from your web account. Add or remove devices; changes apply instantly across all your screens.',
      'Search is effortless — a single word from an actor\u2019s name, release year, genre or title is enough. Enriched media metadata scans the whole library and finds the right result in seconds.'
    ],
    de:[
      'TiviEase Go bündelt Ihre M3U- und Xtream-Codes-Listen in einer App. Live-TV-Guide, Film- & Serienarchiv, Aufnahme, Erinnerungen und Multi-Screen — alles bequem per Fernbedienung steuerbar.',
      'Ihre Kanäle, Filme und Serien unter einem Dach. Automatische Ton- und Untertitel-Erkennung, persönliche Listen und Cloud-Sync halten Ihr Fernsehen bei Ihnen.',
      'Gemacht für Fernbedienungs-Profis. Schnelles Zappen, smarte Suche und Favoriten — flüssiges IPTV auf dem großen Bildschirm.',
      'Aufnehmen, Erinnerungen setzen, mehrere Streams gleichzeitig schauen. Mit Multi-Screen und EPG verpassen Sie nichts.',
      'Ihre Listen synchronisieren vom Android-Handy zum TV, von Windows zu Fire TV. Weitermachen, wo Sie aufgehört haben — einmal einrichten, überall genießen.',
      'Jeder bekommt sein eigenes Profil — eigene Merklisten, Favoriten und Wiedergabepositionen. PIN-geschützte Kindersicherung und Altersfreigaben halten Kinder sicher.',
      'Filme und Folgen herunterladen und offline schauen. Ihre Mediathek reist mit — unterwegs, im Urlaub, auch ohne Verbindung.',
      'Favoriten hinzufügen, an der letzten Stelle weiterschauen, eigene Liste bauen. Die smarte Suche bringt Kanäle, Filme und Serien in Sekunden zu Ihnen.',
      'Sie haben die volle Kontrolle — Abo, verbundene Geräte und Kontoeinstellungen verwalten Sie im Web-Konto. Geräte hinzufügen oder entfernen; Änderungen gelten sofort auf allen Bildschirmen.',
      'Suchen ist mühelos — ein einziges Wort von Schauspieler, Jahr, Genre oder Titel genügt. Angereicherte Mediendaten durchsuchen das gesamte Archiv und finden das richtige Ergebnis in Sekunden.'
    ],
    fr:[
      'TiviEase Go rassemble vos listes M3U et Xtream Codes dans une seule application. Guide TV en direct, bibliothèque films & séries, enregistrement, rappels et multi-écran — tout se gère facilement à la télécommande.',
      'Vos chaînes, films et séries sous un même toit. Détection automatique de l\u2019audio et des sous-titres, listes personnelles et synchro cloud : votre télé vous suit partout.',
      'Conçu pour les amoureux de la télécommande. Zapping rapide, recherche intelligente et favoris — une expérience IPTV fluide sur grand écran.',
      'Enregistrez, programmez des rappels, regardez plusieurs flux à la fois. Avec le multi-écran et l\u2019EPG, vous ne ratez rien.',
      'Vos listes se synchronisent du téléphone Android à la TV, de Windows à Fire TV. Reprenez où vous étiez — une installation, un plaisir partout.',
      'Chacun a son propre profil — listes, favoris et reprises séparés. Contrôle parental par PIN et filtres d\u2019âge pour protéger les enfants.',
      'Téléchargez films et épisodes pour les regarder hors ligne. Votre bibliothèque vous suit — en route, en vacances, même sans connexion.',
      'Ajoutez des favoris, reprenez où vous étiez, créez votre liste. La recherche intelligente affiche chaînes, films et séries en quelques secondes.',
      'Vous gardez le contrôle — gérez votre abonnement, vos appareils associés et vos paramètres depuis votre compte web. Ajoutez ou retirez des appareils ; les changements s\u2019appliquent instantanément.',
      'La recherche est un jeu d\u2019enfant — un seul mot d\u2019un acteur, d\u2019une année, d\u2019un genre ou d\u2019un titre suffit. Les métadonnées enrichies parcourent toute la bibliothèque et trouvent le bon résultat en secondes.'
    ],
    es:[
      'TiviEase Go reúne tus listas M3U y Xtream Codes en una sola app. Guía de TV en directo, archivo de películas y series, grabación, recordatorios y multipantalla — todo se gestiona fácilmente con el mando.',
      'Tus canales, películas y series bajo un mismo techo. Detección automática de audio y subtítulos, listas personales y sincronización en la nube: tu tele siempre contigo.',
      'Diseñado para manos de mando. Zapping rápido, búsqueda inteligente y favoritos — una experiencia IPTV fluida en pantalla grande.',
      'Graba, programa recordatorios y mira varias emisiones a la vez. Con multipantalla y EPG no te pierdes nada.',
      'Tus listas se sincronizan del móvil Android a la TV, de Windows a Fire TV. Retoma donde lo dejaste: configúralo una vez y disfruta en todas partes.',
      'Cada uno tiene su propio perfil — listas, favoritos y puntos de retoma separados. Control parental con PIN y filtros de edad para proteger a los niños.',
      'Descarga películas y episodios para verlos sin conexión. Tu biblioteca viaja contigo — en la carretera, de vacaciones, incluso sin internet.',
      'Añade favoritos, retoma donde lo dejaste, crea tu propia lista. La búsqueda inteligente pone canales, películas y series delante de ti en segundos.',
      'El control es todo tuyo — gestiona tu suscripción, tus dispositivos vinculados y tus ajustes desde tu cuenta web. Añade o quita dispositivos; los cambios se aplican al instante.',
      'Buscar es facilísimo — basta una palabra del actor, el año, el género o el título. Los metadatos enriquecidos recorren todo el archivo y encuentran el resultado correcto en segundos.'
    ],
    it:[
      'TiviEase Go riunisce le tue liste M3U e Xtream Codes in un\u2019unica app. Guida TV in diretta, archivio film e serie, registrazione, promemoria e multischermo — tutto si gestisce facilmente dal telecomando.',
      'I tuoi canali, film e serie sotto un unico tetto. Rilevamento automatico di audio e sottotitoli, liste personali e sincronizzazione cloud: la tua TV sempre con te.',
      'Pensato per chi ama il telecomando. Zapping veloce, ricerca intelligente e preferiti — un\u2019esperienza IPTV fluida sul grande schermo.',
      'Registra, imposta promemoria, guarda più stream insieme. Con multischermo ed EPG non ti perdi nulla.',
      'Le tue liste si sincronizzano dal telefono Android alla TV, da Windows a Fire TV. Riprendi da dove eri rimasto — configura una volta, goditi ovunque.',
      'Ognuno ha il proprio profilo — liste, preferiti e punti di ripresa separati. Controllo genitori con PIN e filtri per età per proteggere i bambini.',
      'Scarica film ed episodi per guardarli offline. La tua libreria viaggia con te — in viaggio, in vacanza, anche senza connessione.',
      'Aggiungi ai preferiti, riprendi da dove eri rimasto, crea la tua lista. La ricerca intelligente mostra canali, film e serie in pochi secondi.',
      'Hai il pieno controllo — gestisci abbonamento, dispositivi collegati e impostazioni dal tuo account web. Aggiungi o rimuovi dispositivi; le modifiche sono immediate su tutti gli schermi.',
      'Cercare è facilissimo — basta una parola di un attore, un anno, un genere o un titolo. I metadati arricchiti scansionano tutta la libreria e trovano il risultato giusto in pochi secondi.'
    ],
    pt:[
      'O TiviEase Go junta as suas listas M3U e Xtream Codes numa única aplicação. Guía de TV em direto, arquivo de filmes e séries, gravação, lembretes e multiecrã — tudo se gere facilmente com o comando.',
      'Os seus canais, filmes e séries debaixo do mesmo teto. Deteção automática de áudio e legendas, listas pessoais e sincronização na nuvem — a sua TV sempre consigo.',
      'Feito para mãos de comando. Zapping rápido, pesquisa inteligente e favoritos — uma experiência IPTV fluida no ecrã grande.',
      'Grave, programe lembretes e veja várias emissões em simultâneo. Com multiecrã e EPG não perde nada.',
      'As suas listas sincronizam do telemóvel Android para a TV, do Windows para o Fire TV. Retome onde parou — configure uma vez, desfrute em todo o lado.',
      'Cada um tem o seu próprio perfil — listas, favoritos e pontos de retoma separados. Controlo parental com PIN e filtros de idade para proteger as crianças.',
      'Descarregue filmes e episódios para ver offline. A sua biblioteca viaja consigo — na estrada, nas férias, mesmo sem ligação.',
      'Adicione favoritos, retome onde parou, crie a sua própria lista. A pesquisa inteligente mostra canais, filmes e séries em segundos.',
      'O controlo é todo seu — gira a sua subscrição, dispositivos ligados e definições a partir da sua conta web. Adicione ou remova dispositivos; as alterações aplicam-se de imediato.',
      'Pesquisar é facílimo — basta uma palavra do ator, do ano, do género ou do título. Os metadados enriquecidos percorrem todo o arquivo e encontram o resultado certo em segundos.'
    ],
    nl:[
      'TiviEase Go bundelt je M3U- en Xtream Codes-lijsten in één app. Live tv-gids, film- en seriebibliotheek, opname, herinneringen en multiscreen — alles bedien je eenvoudig met de afstandsbediening.',
      'Je kanalen, films en series onder één dak. Automatische audio- en ondertiteldetectie, persoonlijke lijsten en cloudsync — je tv is altijd bij je.',
      'Gemaakt voor afstandsbediening-fans. Snel zappen, slim zoeken en favorieten — een vloeiende IPTV-ervaring op het grote scherm.',
      'Neem op, stel herinneringen in en kijk meerdere streams tegelijk. Met multiscreen en EPG mis je niets.',
      'Je lijsten synchroniseren van Android-telefoon naar tv, van Windows naar Fire TV. Ga verder waar je was — eenmalig instellen, overal genieten.',
      'Iedereen heeft een eigen profiel — aparte lijsten, favorieten en hervatpunten. Ouderlijk toezicht met PIN en leeftijdsfilters houdt kinderen veilig.',
      'Download films en afleveringen om offline te kijken. Je bibliotheek reist mee — onderweg, op vakantie, zelfs zonder verbinding.',
      'Voeg favorieten toe, ga verder waar je was, bouw je eigen lijst. Slimme zoekopdracht toont kanalen, films en series in seconden.',
      'Jij hebt de volledige controle — beheer je abonnement, gekoppelde apparaten en instellingen via je webaccount. Voeg apparaten toe of verwijder ze; wijzigingen gelden direct.',
      'Zoeken is moeiteloos — één woord van een acteur, jaartal, genre of titel is genoeg. Verrijkte mediametadata doorzoekt de hele bibliotheek en vindt het juiste resultaat in seconden.'
    ],
    sv:[
      'TiviEase Go samlar dina M3U- och Xtream Codes-listor i en app. TV-guide för livesändningar, film- och seriearkiv, inspelning, påminnelser och multi-skärm — allt styrs smidigt med fjärrkontrollen.',
      'Dina kanaler, filmer och serier under samma tak. Automatisk ljud- och textdetektering, personliga listor och molnsynk — din tv är alltid med dig.',
      'Designad för fjärrkontrollsälskare. Snabb kanalzapping, smart sökning och favoriter — en flytande IPTV-upplevelse på stor skärm.',
      'Spela in, ställ påminnelser och titta på flera sändningar samtidigt. Med multi-skärm och EPG missar du inget.',
      'Dina listor synkas från Android-telefonen till tv:n, från Windows till Fire TV. Fortsätt där du slutade — ställ in en gång, njut överallt.',
      'Alla får sin egen profil — egna listor, favoriter och återupptagningar. PIN-skyddad föräldrakontroll och åldersgränser håller barnen säkra.',
      'Ladda ner filmer och avsnitt för offline-tittande. Ditt bibliotek följer med — på resan, på semestern, även utan uppkoppling.',
      'Lägg till favoriter, fortsätt där du slutade, bygg din egen lista. Smart sökning visar kanaler, filmer och serier på sekunder.',
      'Du har full kontroll — hantera din prenumeration, länkade enheter och kontoinställningar via ditt webbkonto. Lägg till eller ta bort enheter; ändringar gäller direkt.',
      'Att söka är enkelt — ett enda ord från en skådespelare, ett år, en genre eller en titel räcker. Berikade mediametadata söker igenom hela biblioteket och hittar rätt resultat på sekunder.'
    ],
    pl:[
      'TiviEase Go łączy Twoje listy M3U i Xtream Codes w jednej aplikacji. Przewodnik telewizyjny na żywo, archiwum filmów i seriali, nagrywanie, przypomnienia i multiekran — wszystko wygodnie sterowane pilotem.',
      'Twoje kanały, filmy i seriale pod jednym dachem. Automatyczne wykrywanie dźwięku i napisów, osobiste listy i synchronizacja w chmurze — telewizja zawsze z Tobą.',
      'Zaprojektowane dla miłośników pilota. Szybkie przełączanie kanałów, inteligentne wyszukiwanie i ulubione — płynne IPTV na dużym ekranie.',
      'Nagrywaj, ustawiaj przypomnienia i oglądaj kilka transmisji naraz. Z multiekranem i EPG nic Cię nie ominie.',
      'Twoje listy synchronizują się z telefonu na telewizor, z Windows na Fire TV. Kontynuuj od miejsca, w którym skończyłeś — ustaw raz, ciesz się wszędzie.',
      'Każdy ma własny profil — osobne listy, ulubione i miejsca wznowienia. Kontrola rodzicielska z PIN-em i filtry wiekowe chronią dzieci.',
      'Pobieraj filmy i odcinki, by oglądać offline. Twoja biblioteka podróżuje z Tobą — w drodze, na wakacjach, nawet bez połączenia.',
      'Dodawaj do ulubionych, wznawiaj od miejsca, w którym skończyłeś, buduj własną listę. Inteligentne wyszukiwanie pokazuje kanały, filmy i seriale w sekundy.',
      'Masz pełną kontrolę — zarządzaj subskrypcją, połączonymi urządzeniami i ustawieniami z poziomu konta internetowego. Dodawaj i usuwaj urządzenia; zmiany działają od razu.',
      'Wyszukiwanie jest dziecinnie proste — wystarczy jedno słowo z nazwiska aktora, roku, gatunku lub tytułu. Wzbogacone metadane przeszukują całe archiwum i znajdują wynik w sekundy.'
    ],
    cs:[
      'TiviEase Go spojuje vaše seznamy M3U a Xtream Codes v jedné aplikaci. Televizní průvodce živého vysílání, archiv filmů a seriálů, nahrávání, připomínky a multiobraz — vše se pohodlně ovládá dálkovým ovladačem.',
      'Vaše kanály, filmy a seriály pod jednou střechou. Automatická detekce zvuku a titulků, osobní seznamy a cloudová synchronizace drží vaši televizi s vámi.',
      'Navrženo pro ruce zvyklé na dálkový ovladač. Rychlé přepínání kanálů, chytré vyhledávání a oblíbené — plynulý IPTV zážitek na velké obrazovce.',
      'Nahrávejte, nastavujte připomínky a sledujte více vysílání najednou. S multiobrazem a EPG vám nic neunikne.',
      'Vaše seznamy se synchronizují z Androidu do TV, z Windows do Fire TV. Pokračujte tam, kde jste skončili — jednou nastavte, užívejte všude.',
      'Každý má vlastní profil — oddělené seznamy, oblíbené a body pokračování. Rodičovská kontrola s PINem a věkové filtry chrání děti.',
      'Stáhněte si filmy a epizody pro sledování offline. Vaše knihovna cestuje s vámi — na cestách, na dovolené, i bez připojení.',
      'Přidávejte do oblíbených, pokračujte tam, kde jste skončili, stavte vlastní seznam. Chytré hledání ukáže kanály, filmy a seriály během sekund.',
      'Vše máte pod kontrolou — spravujte předplatné, propojená zařízení a nastavení účtu přes webový účet. Přidávejte či odebírejte zařízení; změny platí okamžitě.',
      'Hledání je hračka — stačí jediné slovo od herce, roku, žánru nebo názvu. Obohacená metadata prohledají celou knihovnu a najdou správný výsledek během sekund.'
    ],
    ru:[
      'TiviEase Go объединяет ваши списки M3U и Xtream Codes в одном приложении. Телегид прямого эфира, архив фильмов и сериалов, запись, напоминания и мультиэкран — всё легко управляется с пульта.',
      'Ваши каналы, фильмы и сериалы под одной крышей. Автоопределение звука и субтитров, личные списки и облачная синхронизация — телевизор всегда с вами.',
      'Создано для любителей пульта. Быстрое переключение каналов, умный поиск и избранное — плавный IPTV на большом экране.',
      'Записывайте, ставьте напоминания, смотрите несколько трансляций одновременно. С мультиэкраном и EPG вы ничего не пропустите.',
      'Ваши списки синхронизируются с телефона на телевизор, с Windows на Fire TV. Продолжайте с того места, где остановились — один раз настройте и наслаждайтесь везде.',
      'У каждого свой профиль — отдельные списки, избранное и точки продолжения. Родительский контроль с PIN и возрастные фильтры защищают детей.',
      'Скачивайте фильмы и серии для просмотра офлайн. Ваша библиотека путешествует с вами — в дороге, в отпуске, даже без интернета.',
      'Добавляйте в избранное, продолжайте с места остановки, собирайте свой список. Умный поиск находит каналы, фильмы и сериалы за секунды.',
      'Вы полностью контролируете всё — управляйте подпиской, привязанными устройствами и настройками через веб-аккаунт. Добавляйте и удаляйте устройства; изменения применяются мгновенно.',
      'Поиск — проще простого: достаточно одного слова из имени актёра, года, жанра или названия. Обогащённые метаданные сканируют всю библиотеку и находят нужное за секунды.'
    ],
    uk:[
      'TiviEase Go об\u2019єднує ваші списки M3U та Xtream Codes в одному застосунку. Телегід прямого ефіру, архів фільмів і серіалів, запис, нагадування та мультиекран — усе легко керується пультом.',
      'Ваші канали, фільми та серіали під одним дахом. Автовизначення звуку й субтитрів, особисті списки та хмарна синхронізація — телевізор завжди з вами.',
      'Створено для любителів пульта. Швидке перемикання каналів, розумний пошук і улюблене — плавний IPTV на великому екрані.',
      'Записуйте, встановлюйте нагадування, дивіться кілька трансляцій одночасно. З мультиекраном і EPG ви нічого не пропустите.',
      'Ваші списки синхронізуються з телефона на телевізор, з Windows на Fire TV. Продовжуйте з місця, де зупинилися — налаштуйте раз і насолоджуйтесь скрізь.',
      'У кожного свій профіль — окремі списки, улюблене й точки продовження. Батьківський контроль із PIN та вікові фільтри захищають дітей.',
      'Завантажуйте фільми й серії для перегляду офлайн. Ваша бібліотека подорожує з вами — у дорозі, у відпустці, навіть без інтернету.',
      'Додавайте в улюблене, продовжуйте з місця зупинки, створюйте власний список. Розумний пошук знаходить канали, фільми й серіали за секунди.',
      'Ви повністю контролюєте все — керуйте підпискою, прив\u2019язаними пристроями та налаштуваннями через веб-акаунт. Додавайте й видаляйте пристрої; зміни застосовуються миттєво.',
      'Пошук — простіше простого: достатньо одного слова з імені актора, року, жанру чи назви. Збагачені метадані сканують усю бібліотеку й знаходять потрібне за секунди.'
    ],
    ar:[
      'يجمع TiviEase Go قوائم M3U وXtream Codes الخاصة بك في تطبيق واحد. دليل تلفزيوني للبث المباشر، أرشيف أفلام ومسلسلات، تسجيل وتذكيرات وشاشة متعددة — كل شيء يُدار بسهولة بجهاز التحكم عن بُعد.',
      'قنواتك وأفلامك ومسلسلاتك تحت سقف واحد. كشف تلقائي للغة الصوت والترجمة، قوائم شخصية ومزامنة سحابية تُبقي تلفازك معك.',
      'مصمم لعشاق جهاز التحكم. تنقّل سريع بين القنوات وبحث ذكي ومفضلة — تجربة IPTV سلسة على الشاشة الكبيرة.',
      'سجّل واضبط التذكيرات وشاهد عدة بثوث في وقت واحد. الشاشة المتعددة ودليل EPG يعنيان أنك لن تفوّت أي بث.',
      'تتزامن قوائمك من هاتف أندرويد إلى التلفاز، ومن ويندوز إلى Fire TV. أكمل من حيث توقفت — إعداد مرة واحدة ومتعة في كل مكان.',
      'لكل فرد ملفه الخاص — قوائم ومفضلات ونقاط استئناف منفصلة. رقابة أبوية محمية برمز PIN وفلاتر عمرية تحمي الأطفال.',
      'حمّل الأفلام والحلقات لمشاهدتها دون اتصال. مكتبتك ترافقك — في الطريق، في الإجازة، حتى بدون إنترنت.',
      'أضف إلى المفضلة، واصل من حيث توقفت، أنشئ قائمتك الخاصة. البحث الذكي يعرض القنوات والأفلام والمسلسلات في ثوانٍ.',
      'أنت تملك السيطرة الكاملة — أدِر اشتراكك وأجهزتك المرتبطة وإعدادات حسابك من حسابك على الويب. أضِف الأجهزة أو أزِلها؛ تُطبَّق التغييرات فورًا على كل شاشاتك.',
      'البحث سهل للغاية — كلمة واحدة من اسم ممثل أو سنة إصدار أو نوع أو عنوان تكفي. البيانات الوصفية المثرية تمسح المكتبة كاملة وتجد النتيجة الصحيحة في ثوانٍ.'
    ],
    fa:[
      'TiviEase Go فهرست‌های M3U و Xtream Codes شما را در یک اپلیکیشن گرد می‌آورد. راهنمای تلویزیونی پخش زنده، آرشیو فیلم و سریال، ضبط، یادآوری و چندصفحه‌ای — همه به‌راحتی با ریموت کنترل می‌شوند.',
      'کانال‌ها، فیلم‌ها و سریال‌های شما زیر یک سقف. تشخیص خودکار زبان صدا و زیرنویس، فهرست‌های شخصی و همگام‌سازی ابری تلویزیون را همیشه همراه شما نگه می‌دارد.',
      'برای دست‌های عاشق ریموت طراحی شده. جابه‌جایی سریع بین کانال‌ها، جستجوی هوشمند و علاقه‌مندی‌ها — تجربه‌ای روان از IPTV روی صفحه بزرگ.',
      'ضبط کنید، یادآوری تنظیم کنید و چند پخش را هم‌زمان تماشا کنید. با چندصفحه‌ای و EPG هیچ برنامه‌ای را از دست نمی‌دهید.',
      'فهرست‌های شما از گوشی اندروید تا تلویزیون، از ویندوز تا Fire TV همگام می‌شوند. از همان‌جا که ماندید ادامه دهید — یک بار راه‌اندازی، لذت در همه‌جا.',
      'هرکس پروفایل خودش را دارد — فهرست‌ها، علاقه‌مندی‌ها و نقاط ادامهٔ جداگانه. کنترل والدین با PIN و فیلترهای سنی از کودکان محافظت می‌کند.',
      'فیلم‌ها و قسمت‌ها را دانلود کنید و آفلاین تماشا کنید. کتابخانه‌تان همراه شماست — در راه، در تعطیلات، حتی بدون اتصال.',
      'به علاقه‌مندی‌ها اضافه کنید، از همان‌جا ادامه دهید، فهرست خودتان را بسازید. جستجوی هوشمند کانال‌ها، فیلم‌ها و سریال‌ها را در چند ثانیه جلوی شما می‌آورد.',
      'کنترل کامل دست شماست — اشتراک، دستگاه‌های متصل و تنظیمات حسابتان را از حساب وب مدیریت کنید. دستگاه اضافه یا حذف کنید؛ تغییرات بلافاصله روی همه صفحه‌ها اعمال می‌شود.',
      'جستجو بسیار آسان است — یک کلمه از نام بازیگر، سال ساخت، ژانر یا عنوان کافی است. فراداده‌های غنی‌شده کل آرشیو را می‌گردند و نتیجهٔ درست را در چند ثانیه پیدا می‌کنند.'
    ],
    az:[
      'TiviEase Go M3U və Xtream Codes pleylistlərinizi bir tətbiqdə birləşdirir. Canlı TV bələdçisi, film və serial arxivi, yazı, xatırlatmalar və çoxekran — hər şey pultdan rahat idarə olunur.',
      'Kanallarınız, filmləriniz və seriallarınız bir səviyyədə. Avtomatik dil və subtitr aşkarlanması, şəxsi siyahılar və bulud sinxronizasiyası ilə televiziyanız həmişə sizinlədir.',
      'Pult sevən əllər üçün hazırlanıb. Sürətli kanal keçidi, ağıllı axtarış və seçilənlər — böyük ekranda axıcı IPTV təcrübəsi.',
      'Yazın, xatırlatma qurun, eyni anda bir neçə yayım izləyin. Çoxekran və EPG ilə heç bir yayımı qaçırmayın.',
      'Siyahılarınız Android telefondan TV-yə, Windows-dan Fire TV-yə sinxronlaşır. Qaldığınız yerdən davam edin — bir dəfə qurun, hər yerdə izləyin.',
      'Hər kəsin öz profili var — ayrı siyahılar, seçilənlər və davam nöqtələri. PIN qorumalı valideyn nəzarəti və yaş filtrləri uşaqları təhlükəsiz saxlayır.',
      'Film və bölümləri endirin, oflayn izləyin. Kitabxananız sizinlə gəlir — yolda, tətil dönəmində, hətta bağlantısız.',
      'Seçilənlərə əlavə edin, dayandığınız yerdən davam edin, öz siyahınızı qurun. Ağıllı axtarış kanalları, filmləri və serialları saniyələrlə qarşınıza gətirir.',
      'Nəzarət tam sizdədir — abunəliyinizi, bağlı cihazlarınızı və hesab parametrlərinizi veb hesabınızdan idarə edin. Cihaz əlavə edin və ya çıxarın; dəyişikliklər dərhal bütün ekranlarınıza tətbiq olunur.',
      'Axtarış çox asandır — aktyor adı, il, janr və ya başlıqdan tək bir söz kifayətdir. Zənginləşdirilmiş media metadatası bütün arxivi tarayır və saniyələrlə doğru nəticəni tapır.'
    ],
    hi:[
      'TiviEase Go आपकी M3U और Xtream Codes प्लेलिस्ट को एक ऐप में जोड़ता है। लाइव टीवी गाइड, मूवी और सीरीज़ लाइब्रेरी, रिकॉर्डिंग, रिमाइंडर और मल्टी-स्क्रीन — सब कुछ रिमोट से आसानी से।',
      'आपके चैनल, फ़िल्में और सीरीज़ एक ही छत के नीचे। ऑडियो और सबटाइटल का ऑटो-डिटेक्शन, पर्सनल लिस्ट और क्लाउड सिंक — आपका टीवी हमेशा साथ।',
      'रिमोट-प्रेमी हाथों के लिए बनाया गया। तेज़ चैनल बदलाव, स्मार्ट सर्च और फ़ेवरिट — बड़ी स्क्रीन पर स्मूद IPTV अनुभव।',
      'रिकॉर्ड करें, रिमाइंडर सेट करें, एक साथ कई स्ट्रीम देखें। मल्टी-स्क्रीन और EPG से कोई प्रसारण मिस नहीं होगा।',
      'आपकी लिस्ट Android फ़ोन से TV, Windows से Fire TV तक सिंक होती हैं। जहाँ छोड़ा वहीं से जारी रखें — एक बार सेटअप, हर जगह आनंद।',
      'हर किसी की अपनी प्रोफ़ाइल — अलग लिस्ट, फ़ेवरिट और रिज़्यूम पॉइंट। PIN-सुरक्षित पैरेंटल कंट्रोल और उम्र फ़िल्टर बच्चों को सुरक्षित रखते हैं।',
      'फ़िल्में और एपिसोड डाउनलोड करके ऑफ़लाइन देखें। आपकी लाइब्रेरी आपके साथ चलती है — रास्ते में, छुट्टियों में, बिना कनेक्शन के भी।',
      'फ़ेवरिट में जोड़ें, जहाँ छोड़ा वहीं से जारी रखें, अपनी लिस्ट बनाएं। स्मार्ट सर्च चैनल, फ़िल्में और सीरीज़ सेकंडों में सामने लाता है।',
      'कंट्रोल पूरी तरह आपके हाथ में — अपनी सब्सक्रिप्शन, जुड़े डिवाइस और अकाउंट सेटिंग वेब अकाउंट से मैनेज करें। डिवाइस जोड़ें या हटाएं; बदलाव तुरंत सभी स्क्रीन पर लागू होते हैं।',
      'खोज बेहद आसान है — अभिनेता के नाम, रिलीज़ वर्ष, शैली या शीर्षक का बस एक शब्द काफी है। समृद्ध मीडिया मेटाडेटा पूरी लाइब्रेरी स्कैन करके सेकंडों में सही परिणाम ढूंढता है।'
    ],
    id:[
      'TiviEase Go menyatukan playlist M3U dan Xtream Codes Anda dalam satu aplikasi. Panduan TV siaran langsung, arsip film & serial, perekaman, pengingat, dan multi-layar — semua mudah dikendalikan dengan remote.',
      'Saluran, film, dan serial Anda dalam satu atap. Deteksi otomatis audio & subtitle, daftar pribadi, dan sinkronisasi cloud membuat TV Anda selalu bersama Anda.',
      'Dirancang untuk jempol remot. Zapping saluran cepat, pencarian cerdas, dan favorit — pengalaman IPTV yang mulus di layar besar.',
      'Rekam, atur pengingat, tonton beberapa siaran sekaligus. Dengan multi-layar dan EPG, tak ada siaran yang terlewat.',
      'Playlist Anda tersinkron dari ponsel Android ke TV, dari Windows ke Fire TV. Lanjutkan dari titik terakhir — atur sekali, nikmati di mana saja.',
      'Setiap orang punya profil sendiri — daftar, favorit, dan titik lanjut terpisah. Kontrol orang tua ber-PIN dan filter usia menjaga anak-anak tetap aman.',
      'Unduh film dan episode untuk ditonton offline. Pustaka Anda ikut serta — di perjalanan, saat liburan, bahkan tanpa koneksi.',
      'Tambahkan ke favorit, lanjutkan dari titik terakhir, bangun daftar Anda sendiri. Pencarian cerdas menampilkan saluran, film, dan serial dalam hitungan detik.',
      'Kendali sepenuhnya di tangan Anda — kelola langganan, perangkat tertaut, dan pengaturan akun dari akun web Anda. Tambah atau hapus perangkat; perubahan langsung berlaku di semua layar.',
      'Mencari itu mudah — cukup satu kata dari nama aktor, tahun, genre, atau judul. Metadata media yang diperkaya memindai seluruh pustaka dan menemukan hasil yang tepat dalam hitungan detik.'
    ],
    ms:[
      'TiviEase Go menyatukan senarai main M3U dan Xtream Codes anda dalam satu aplikasi. Panduan TV langsung, arkib filem & siri, rakaman, peringatan dan pelbagai skrin — semua mudah dikawal dengan alat kawalan jauh.',
      'Saluran, filem dan siri anda di bawah satu bumbung. Pengesanan audio & sari kata automatik, senarai peribadi dan penyegerakan awan — TV anda sentiasa bersama.',
      'Direka untuk peminat alat kawalan jauh. Zapping saluran pantas, carian pintar dan kegemaran — pengalaman IPTV lancar pada skrin besar.',
      'Rakam, tetapkan peringatan, tonton beberapa siaran serentak. Dengan pelbagai skrin dan EPG, tiada siaran yang terlepas.',
      'Senarai main anda disegerakkan dari telefon Android ke TV, dari Windows ke Fire TV. Sambung dari tempat anda berhenti — atur sekali, nikmati di mana-mana.',
      'Setiap orang ada profil sendiri — senarai, kegemaran dan titik sambung berasingan. Kawalan ibu bapa ber-PIN dan penapis umur memastikan anak-anak selamat.',
      'Muat turun filem dan episod untuk tontonan luar talian. Pustaka anda mengikut anda — dalam perjalanan, semasa bercuti, walaupun tanpa sambungan.',
      'Tambah ke kegemaran, sambung dari tempat berhenti, bina senarai sendiri. Carian pintar memaparkan saluran, filem dan siri dalam beberapa saat.',
      'Kawalan sepenuhnya di tangan anda — urus langganan, peranti terpaut dan tetapan akaun melalui akaun web anda. Tambah atau buang peranti; perubahan terus berkuat kuasa pada semua skrin.',
      'Mencari amat mudah — satu kata daripada nama pelakon, tahun, genre atau tajuk sudah memadai. Metadata media diperkaya mengimbas seluruh pustaka dan mencari hasil yang tepat dalam beberapa saat.'
    ],
    ja:[
      'TiviEase Go は M3U と Xtream Codes プレイリストを 1 つのアプリにまとめます。ライブ TV ガイド、映画・ドラマアーカイブ、録画、リマインダー、マルチスクリーン — すべてリモコンで快適に操作できます。',
      'チャンネルも映画もドラマもひとつの屋根の下。音声・字幕の自動検出、自分だけのリスト、クラウド同期でテレビはいつもあなたと一緒。',
      'リモコンを愛する手のために設計。高速なチャンネル切替、スマート検索、お気に入り — 大画面で滑らかな IPTV 体験。',
      '録画して、リマインダーを設定して、複数の放送を同時に視聴。マルチスクリーンと EPG で見逃しはありません。',
      'プレイリストは Android スマホからテレビへ、Windows から Fire TV へ同期。続きからそのまま — 設定は一度、楽しみはどこでも。',
      '家族それぞれが自分のプロフィールを持てます — リスト、お気に入り、再開位置は個別に管理。PIN 保護のペアレンタルコントロールと年齢フィルターでお子さまも安心。',
      '映画やエピソードをダウンロードしてオフラインで視聴。ライブラリはあなたと一緒に — 旅先でも、休暇中でも、オフラインでも。',
      'お気に入りに追加、続きから再生、自分だけのリストを作成。スマート検索がチャンネル・映画・ドラマを数秒で見つけます。',
      'すべてあなたの管理下に — サブスクリプション、連携デバイス、アカウント設定はウェブアカウントから管理。デバイスの追加・削除は即座に全画面に反映されます。',
      '検索はとても簡単 — 俳優名、公開年、ジャンル、タイトルのどれか一語だけで十分。強化されたメディアメタデータがライブラリ全体をスキャンし、数秒で目的の結果を見つけます。'
    ],
    ko:[
      'TiviEase Go는 M3U 및 Xtream Codes 재생목록을 하나의 앱으로 통합합니다. 라이브 TV 가이드, 영화·시리즈 아카이브, 녹화, 리마인더, 멀티스크린 — 모두 리모컨으로 편하게 제어하세요.',
      '채널, 영화, 시리즈가 한 지붕 아래. 자동 음성·자막 감지, 나만의 목록, 클라우드 동기화로 TV가 항상 함께합니다.',
      '리모컨을 사랑하는 손을 위한 설계. 빠른 채널 전환, 스마트 검색, 즐겨찾기 — 큰 화면에서 매끄러운 IPTV 경험.',
      '녹화하고, 리마인더를 설정하고, 여러 방송을 동시에 시청하세요. 멀티스크린과 EPG로 놓치는 방송이 없습니다.',
      '재생목록은 안드로이드 폰에서 TV로, Windows에서 Fire TV로 동기화. 보던 곳부터 이어서 — 한 번 설정, 어디서나 즐기기.',
      '가족 모두가 각자의 프로필을 사용 — 별도의 목록, 즐겨찾기, 이어보기 지점. PIN 보호 자녀 보호 기능과 연령 필터로 아이들도 안전합니다.',
      '영화와 에피소드를 다운로드해 오프라인으로 시청하세요. 라이브러리는 어디든 함께 — 이동 중에도, 휴가 중에도, 연결 없이도.',
      '즐겨찾기에 추가하고, 보던 곳부터 이어 보고, 나만의 목록을 만드세요. 스마트 검색이 채널·영화·시리즈를 몇 초 만에 찾아줍니다.',
      '모든 것이 당신의 통제 아래 — 구독, 연결된 기기, 계정 설정을 웹 계정에서 관리하세요. 기기를 추가하거나 제거하면 변경 사항이 즉시 모든 화면에 적용됩니다.',
      '검색은 정말 쉽습니다 — 배우 이름, 개봉 연도, 장르, 제목 중 단 한 단어면 충분합니다. 강화된 미디어 메타데이터가 라이브러리 전체를 스캔해 몇 초 만에 정확한 결과를 찾아줍니다.'
    ],
    zh:[
      'TiviEase Go 将您的 M3U 和 Xtream Codes 播放列表整合到一个应用中。直播电视指南、电影与剧集库、录制、提醒、多屏播放——一切尽在遥控器掌控之中。',
      '您的频道、电影和剧集尽在同一屋檐下。自动检测音轨与字幕、个人列表和云同步——电视始终与您相伴。',
      '为遥控器爱好者而设计。快速换台、智能搜索与收藏——大屏上的流畅 IPTV 体验。',
      '录制、设置提醒、同时观看多路直播。多屏与 EPG 让您不再错过任何节目。',
      '播放列表从安卓手机同步到电视、从 Windows 到 Fire TV。从上次停下的地方继续——一次设置，处处畅享。',
      '每个人都有自己的专属档案——独立列表、收藏和续播点。PIN 保护的家长控制与年龄分级让孩子安全观看。',
      '下载电影和剧集离线观看。您的媒体库随身而行——旅途中、度假时，即使没有网络也能看。',
      '加入收藏、从上次位置继续、创建自己的列表。智能搜索几秒内呈现频道、电影和剧集。',
      '一切尽在您的掌控——通过网页账户管理订阅、已连接设备和账户设置。添加或移除设备，更改即刻同步到您的所有屏幕。',
      '搜索毫不费力——演员名字、上映年份、类型或片名中的一个词就足够。强化的媒体元数据扫描整个内容库,几秒钟内找到正确结果。'
    ],
    th:[
      'TiviEase Go รวมเพลย์ลิสต์ M3U และ Xtream Codes ของคุณไว้ในแอปเดียว ไกด์ทีวีสด คลังภาพยนตร์และซีรีส์ การบันทึก การเตือน และหลายหน้าจอ — ทุกอย่างควบคุมง่ายด้วยรีโมท',
      'ช่อง ภาพยนตร์ และซีรีส์ของคุณอยู่ใต้หลังคาเดียวกัน ตรวจจับเสียงและคำบรรยายอัตโนมัติ รายการส่วนตัว และซิงก์บนคลาวด์ — ทีวีของคุณอยู่กับคุณเสมอ',
      'ออกแบบมาเพื่อคนรักรีโมท เปลี่ยนช่องรวดเร็ว ค้นหาอัจฉริยะ และรายการโปรด — ประสบการณ์ IPTV ที่ลื่นไหลบนจอใหญ่',
      'บันทึก ตั้งการเตือน และดูหลายรายการพร้อมกัน ด้วยหลายหน้าจอและ EPG คุณจะไม่พลาดรายการใด',
      'เพลย์ลิสต์ของคุณซิงก์จากโทรศัพท์ Android ไปยังทีวี จาก Windows ไปยัง Fire TV ดูต่อจากจุดที่ค้างไว้ — ตั้งค่าครั้งเดียว เพลิดเพลินได้ทุกที่',
      'ทุกคนมีโปรไฟล์ของตัวเอง — รายการ รายการโปรด และจุดดูต่อแยกกัน การควบคุมโดยผู้ปกครองที่ป้องกันด้วย PIN และตัวกรองอายุช่วยให้เด็กปลอดภัย',
      'ดาวน์โหลดภาพยนตร์และตอนต่างๆ เพื่อดูออฟไลน์ คลังของคุณติดตัวไปด้วย — ระหว่างเดินทาง ในวันหยุด แม้ไม่มีอินเทอร์เน็ต',
      'เพิ่มรายการโปรด ดูต่อจากจุดที่ค้างไว้ สร้างรายการของคุณเอง การค้นหาอัจฉริยะแสดงช่อง ภาพยนตร์ และซีรีส์ในไม่กี่วินาที',
      'คุณมีอำนาจควบคุมเต็มที่ — จัดการการสมัครสมาชิก อุปกรณ์ที่เชื่อมต่อ และการตั้งค่าบัญชีจากบัญชีเว็บของคุณ เพิ่มหรือลบอุปกรณ์; การเปลี่ยนแปลงมีผลทันทีบนทุกหน้าจอ',
      'การค้นหาเป็นเรื่องง่าย — เพียงคำเดียวจากชื่อนักแสดง ปีที่ฉาย ประเภท หรือชื่อเรื่องก็เพียงพอ เมทาดาทาสื่อที่สมบูรณ์สแกนทั้งคลังและค้นหาผลลัพธ์ที่ถูกต้องในไม่กี่วินาที'
    ],
    vi:[
      'TiviEase Go hợp nhất danh sách phát M3U và Xtream Codes của bạn trong một ứng dụng. Hướng dẫn TV trực tiếp, kho phim & series, ghi lại, nhắc lịch và đa màn hình — tất cả điều khiển dễ dàng bằng remote.',
      'Kênh, phim và series của bạn dưới một mái nhà. Tự động nhận diện âm thanh và phụ đề, danh sách cá nhân và đồng bộ đám mây — TV luôn bên bạn.',
      'Thiết kế cho những bàn tay mê remote. Chuyển kênh nhanh, tìm kiếm thông minh và yêu thích — trải nghiệm IPTV mượt mà trên màn hình lớn.',
      'Ghi lại, đặt nhắc lịch, xem nhiều chương trình cùng lúc. Với đa màn hình và EPG, bạn không bỏ lỡ chương trình nào.',
      'Danh sách phát đồng bộ từ điện thoại Android sang TV, từ Windows sang Fire TV. Xem tiếp từ chỗ đã dừng — cài một lần, tận hưởng mọi nơi.',
      'Mỗi người có hồ sơ riêng — danh sách, yêu thích và điểm xem tiếp riêng biệt. Kiểm soát phụ huynh bằng PIN và bộ lọc độ tuổi giúp trẻ em an toàn.',
      'Tải phim và tập để xem ngoại tuyến. Thư viện của bạn đi theo bạn — trên đường, trong kỳ nghỉ, kể cả khi không có mạng.',
      'Thêm vào yêu thích, xem tiếp từ chỗ đã dừng, xây dựng danh sách riêng. Tìm kiếm thông minh hiển thị kênh, phim và series trong vài giây.',
      'Bạn toàn quyền kiểm soát — quản lý gói đăng ký, thiết bị đã liên kết và cài đặt tài khoản từ tài khoản web. Thêm hoặc xóa thiết bị; thay đổi áp dụng ngay trên mọi màn hình.',
      'Tìm kiếm thật dễ dàng — chỉ cần một từ trong tên diễn viên, năm phát hành, thể loại hoặc tiêu đề. Metadata media được làm giàu quét toàn bộ thư viện và tìm đúng kết quả trong vài giây.'
    ]
  };
  var list=P[lang];
  if(!list||list.length<2) return;
  var i=0;
  function tick(){
    el.classList.add('h1-swap');
    setTimeout(function(){
      i=(i+1)%list.length;
      el.textContent=list[i];
      el.classList.remove('h1-swap');
    },550);
  }
  setTimeout(function(){ setInterval(tick,8500); },4000);
})();
