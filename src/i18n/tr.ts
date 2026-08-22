import type { Catalog } from "./en";

/**
 * Turkish.
 *
 * Ölçüm birimleri ve donanımın kendi bildirdiği değerler çevrilmez: dB dB'dir,
 * ürün adı donanımın kendine verdiği addır. Çevrilen şey, uygulamanın kendi
 * söyledikleridir.
 */
export const tr: Catalog = {
  meta: {
    name: "Türkçe",
  },

  app: {
    name: "Headset Control Center",
    tagline: "Yerel · Açık donanım",
    sections: "Bölümler",
    connection: "Bağlantı",
    noDeviceDetected: "Cihaz bulunamadı",
    lookingForDevices: "Cihaz aranıyor",
    commandFailed: "Cihaz komutu başarısız oldu",
    dismiss: "Kapat",
  },

  nav: {
    dashboard: "Panel",
    audio: "Ses",
    microphone: "Mikrofon",
    equaliser: "Ekolayzer",
    profiles: "Profiller",
    device: "Cihaz",
    settings: "Ayarlar",
  },

  connection: {
    connected: "Bağlı",
    disconnected: "Bağlı değil",
    connecting: "Bağlanıyor",
    reconnecting: "Yeniden bağlanıyor",
    unknown: "Bilinmiyor",
    error: "Hata",
  },

  strip: {
    device: "Cihaz",
    link: "Bağlantı",
    battery: "Pil",
    chatmix: "ChatMix",
    noDevice: "Cihaz yok",
    poweredOn: "Kulaklık açık",
    poweredOff: "Kulaklık kapalı",
    charging: "Şarj oluyor",
    reportedLevels: (count: number) => `${count} kademe bildiriliyor`,
    notSupported: "Desteklenmiyor",
    notReportedWhileOff: "Kapalıyken bildirilmiyor",
  },

  empty: {
    title: "Uyumlu cihaz bulunamadı",
    lede: "Bu uygulamanın konuşmayı bildiği hiçbir cihaz şu anda bağlı değil.",
    hints: [
      "Kablosuz alıcının takılı olduğundan emin olun.",
      "Kulaklığı açın ve eşleşmesi için birkaç saniye bekleyin.",
      "Kulaklığı yöneten başka bir yazılım varsa kapatın — cihazı aynı anda yalnızca bir uygulama tutabilir.",
    ],
    scanning: "Aranıyor",
    scanAgain: "Yeniden ara",
    useSimulated: "Simüle cihaz kullan",
  },

  conflict: {
    title: (name: string) => `${name} bağlı ama açılamıyor`,
    useSimulatedInstead: "Bunun yerine simüle cihazla çalış",
    explain:
      "Kontrol arayüzünü başka bir uygulama tutuyor. Bu sistemde bu genellikle bir arka plan servisidir; onu durdurmak kulaklığı serbest bırakır:",
    nothingChanged:
      "Sisteminizde hiçbir şey değiştirilmedi — bu uygulamanın devralmasını istiyorsanız komutu kendiniz çalıştırın, sonra şununla geri açabilirsiniz:",
  },

  dashboard: {
    hostErrorTitle: "Donanım erişimi yok",
    simulatedTitle: "Simüle cihaz",
    simulatedBody:
      "Bu değerler kulaklıktan değil, uygulamanın kendisinden geliyor. Gerçek donanım bağlandığında Ayarlar'dan kapatın.",

    controlsLegend: "Kontroller",
    controlsTitle: "Hızlı kontroller",
    outputVolume: "Çıkış sesi",
    hardwareSteps: (count: number) => `${count} donanım kademesi`,
    mute: "Sustur",
    unmute: "Sesi aç",
    muteMic: "Mikrofonu sustur",
    unmuteMic: "Mikrofonu aç",
    sidetone: "Sidetone",

    powerLegend: "Güç",
    batteryTitle: "Pil",
    chargingOverUsb: "USB üzerinden şarj oluyor",
    lowChargeSoon: "Düşük — yakında şarj edin",
    runningOnBattery: "Pille çalışıyor",
    batteryResolution: (levels: number) =>
      `Kulaklık yüzde yerine ${levels} kademe bildiriyor, bu yüzden bu değer basamaklar hâlinde değişir. Cihazın gönderdiği şeydir, bir tahmin değil.`,
    batteryOff: "Kulaklık kapalı, bu yüzden pil seviyesi bildirmiyor.",
    batteryUnsupported: "Bu cihaz pil seviyesi bildirmiyor.",

    mixLegend: "Karışım",
    chatmixTitle: "ChatMix",
    game: "Oyun",
    chat: "Sohbet",
    chatmixExplain:
      "Çark kulaklığın üzerinde. Burada yalnızca nerede olduğu görünür; buradan çevrilemez.",
    chatmixOff: "Kulaklık kapalı, bu yüzden çark konumu bildirilmiyor.",
    chatmixUnsupported: "Bu cihazda ChatMix çarkı yok.",

    statusLegend: "Durum",
    liveTitle: "Canlı okumalar",
    liveDescription: "Cihazdan en son alınan değerler.",
    power: "Güç",
    on: "Açık",
    off: "Kapalı",
    autoShutOff: "Otomatik kapanma",
    equaliser: "Ekolayzer",
    minutes: (count: number) => `${count} dk`,
    custom: "Özel",
    notReadBack: "Geri okunamıyor",
    notSupported: "Desteklenmiyor",
    notReadBackExplain:
      '"Geri okunamıyor", kulaklığın ayarı kabul ettiği ama mevcut değerini sorma imkânı vermediği anlamına gelir. Burada gösterilen, cihaza söylenmiş olandır; yeniden bağlantıdan sonra tahmin etmek yerine hiçbir şey gösterilmez.',
  },

  audio: {
    noDeviceTitle: "Bağlı cihaz yok",
    noDeviceBody: "Sesini kontrol etmek için bir kulaklık bağlayın.",
    noControlTitle: "Bu cihazda ses kontrolü yok",
    cardUnreadable: "Cihazın ses kartı okunamadı.",
    noHardwareVolume: "Bu kulaklık donanımsal bir ses kontrolü sunmuyor.",

    outputLegend: "Çıkış",
    volumeTitle: "Ses",
    volumeDescription:
      "Kulaklığın kendi ses ayarı — kulaklıktaki çarkla aynı kontrol.",
    muted: "Susturuldu",
    mute: "Sustur",
    gain: "Kazanç",
    outputLevel: "Çıkış seviyesi",
    levelDetail: (steps: number) =>
      `${steps} donanım kademesi. Bunu değiştirmek kulaklığı yalnızca bu uygulama için değil, tüm uygulamalar için değiştirir.`,
    mutedTitle: "Çıkış susturuldu",
    mutedBody: "Kulaklık susturulmuşken seviye kontrolü devre dışıdır.",

    notAvailableLegend: "Mevcut değil",
    notAvailableTitle: "Bu cihazın yapamadıkları",
    absent: [
      {
        name: "Ses sınırlayıcı",
        detail: "Donanımda azami seviye sınırı yok.",
      },
      { name: "Uzamsal ses", detail: "Bu kulaklığın bir özelliği değil." },
      {
        name: "Yazılımsal ekolayzer",
        detail:
          "Ekolayzeri kulaklığın kendisi uyguluyor — Ekolayzer sayfasına bakın.",
      },
    ],
  },

  microphone: {
    noDeviceTitle: "Bağlı cihaz yok",
    noDeviceBody: "Mikrofonunu kontrol etmek için bir kulaklık bağlayın.",

    inputLegend: "Giriş",
    title: "Mikrofon",
    description: "Kulaklığın kendi ses donanımındaki kayıt kazancı.",
    muted: "Susturuldu",
    mute: "Sustur",
    gain: "Kazanç",
    captureLevel: "Kayıt seviyesi",
    levelDetail: (steps: number) => `${steps} donanım kademesi.`,
    mutedTitle: "Mikrofon susturuldu",
    mutedBody:
      "Hiçbir şey kaydedilmiyor. Bu donanımsal susturmadır, yani tüm uygulamalar için geçerlidir.",
    noControl: "Bu cihaz mikrofon kontrolü sunmuyor.",

    monitoringLegend: "İzleme",
    sidetoneTitle: "Sidetone",
    sidetoneDescription: "Kulaklığın kendi sesinizi size ne kadar geri vereceği.",
    level: "Seviye",
    sidetoneSteps: (count: number) =>
      `Kulaklık ${count} konum saklıyor, bu yüzden bu bir kaydırıcı değil, bir anahtardır.`,
    sidetoneUnknown:
      " Hangisinin ayarlı olduğunu bildirmiyor — seçim, siz belirledikten sonra burada görünür.",
    sidetoneUnsupported: "Bu cihazda sidetone kontrolü yok.",

    processingLegend: "Mevcut değil",
    processingTitle: "Mikrofon işleme",
    processingBody:
      "Bu kulaklık mikrofon sinyaline hiçbir işlem uygulamıyor. Aşağıdakilerin hiçbiri donanımında yok ve bu uygulama onları yazılımda uygulayıp cihaz özelliği diye sunmaz:",
    processingList: [
      "Gürültü azaltma",
      "Gürültü kapısı",
      "Kompresör",
      "Limitleyici",
      "Ses iyileştirme",
      "Mikrofon sessiz LED'i",
    ],
  },

  equaliser: {
    unavailableTitle: "Ekolayzer yok",
    noEqualiser: "Bu cihazda ekolayzer yok.",
    connectFirst: "Ekolayzerini ayarlamak için bir kulaklık bağlayın.",

    toneLegend: "Ton",
    title: "Ekolayzer",
    hardwareDescription:
      "Kulaklığın kendisi uyguluyor — her uygulama için ve kulaklığın takıldığı her yerde geçerli kalır.",
    softwareDescription: "Bu uygulama tarafından uygulanıyor.",
    flat: "Düz",
    presets: "Hazır ayarlar",
    custom: "Özel",
    bandLabel: (frequency: string) => `${frequency} bandı`,
    bandValue: (decibels: string, frequency: string) =>
      `${frequency} bandında ${decibels} desibel`,
    range: (bands: number, min: number, max: number, step: number) =>
      `${bands} bant · ${min} ile +${max} dB · ${step} dB adım`,
    frequenciesAreLabels:
      "Bant frekansları yalnızca etikettir: kulaklık on konumsal kazanç kabul eder ve onlara isim vermez, bu yüzden bunlar standart on bant aralığını izler.",
    noReadBackTitle: "Kulaklık eğrisini bildirmiyor",
    noReadBackBody:
      "Bu cihaza ekolayzerinin şu an neye ayarlı olduğunu soracak bir komut yok. Yeniden bağlantıdan sonra sürgüler düz başlar ve o andan itibaren bu uygulamanın gönderdiklerini gösterir — kulaklığın uyguladığını değil. Bir hazır ayar seçmek ya da bir sürgüyü oynatmak ikisini eşitler.",
  },

  profiles: {
    savedLegend: "Kayıtlı",
    title: "Profiller",
    description:
      "Bu uygulamanın sakladığı ve istendiğinde kulaklığa gönderdiği ayarlar.",
    saveAs: "Mevcut ayarları şu adla kaydet",
    placeholder: "Gece, Görüşme, Oyun…",
    save: "Kaydet",
    noDeviceTitle: "Bağlı cihaz yok",
    noDeviceBody:
      "Profiller yalnızca bir kulaklık bağlıyken uygulanabilir ve düzenlenebilir — mevcut ayarların okunacağı bir yer yok.",
    failedTitle: "Bu işe yaramadı",
    empty:
      "Henüz profil yok. Kulaklığı istediğiniz gibi ayarlayın, sonra burada kaydedin.",
    lastApplied: "en son uygulanan",
    nothingStored: "Hiçbir şey saklanmıyor",
    apply: "Uygula",
    rename: (name: string) => `${name} profilini yeniden adlandır`,
    remove: (name: string) => `${name} profilini sil`,
    confirmRename: "Adlandırmayı onayla",
    cancelRename: "Adlandırmayı iptal et",

    resultLegend: "Sonuç",
    resultTitle: (name: string) => `"${name}" uygulandı`,
    sent: (settings: string) => `Kulaklığa gönderildi: ${settings}.`,
    nothingSent: "Bu profil hiçbir ayar tutmuyor, bu yüzden bir şey gönderilmedi.",

    howLegend: "Bu nasıl çalışır",
    howTitle: "Profiller burada durur, kulaklıkta değil",
    howBody1:
      'Bu kulaklığın ayarlar için cihaz üstü hafızası yok, bu yüzden burada "cihaza kaydet" düğmesi de yok — protokolünde böyle bir komut bulunmuyor. Bir profili uygulamak, her ayarı cihaza tek tek göndermek demektir; tıpkı elle ayarlamış gibi.',
    howBody2:
      "Bu aynı zamanda kulaklığın kendi kontrolleriyle, bu uygulamanın haberi olmadan değiştirilebileceği anlamına gelir. En son uygulanan olarak işaretlenen profil, ne gönderildiğinin kaydıdır; donanımın şu an ne yaptığının iddiası değil.",

    contents: {
      volume: "Ses",
      muted: "Susturulmuş",
      unmuted: "Sesi açık",
      micLevel: "Mikrofon seviyesi",
      micMuted: "Mikrofon susturulmuş",
      micLive: "Mikrofon açık",
      sidetone: "Sidetone",
      autoShutOff: "Otomatik kapanma",
      equaliserCurve: "Ekolayzer eğrisi",
      equaliserPreset: "Ekolayzer hazır ayarı",
    },
  },

  chatmix: {
    splitTitle: "Oyun ve sohbet sesini ayır",
    splitDetail:
      "İki çıkış ekler — Headset — Game ve Headset — Chat — ve ikisini kulaklığa karıştırır. Çark da aralarındaki dengeyi ayarlar; zaten bunun için var.",
    splitDisabledReason: "Önce kulaklığı bağlayın.",
    activeTitle: "Oyun ve sohbet çıkışları hazır",
    activeBody:
      "Her uygulamayı kendi ses denetiminizden Headset — Game ya da Headset — Chat çıkışına atayın. Çarkı çevirmek aralarındaki dengeyi değiştirir.",
    failedTitle: "Çıkışlar oluşturulamadı",
    note: "Bu, yalnızca bu uygulamanın değil, tüm oturumunuzun ses aygıtlarını değiştirir. Kapatmak onları kaldırır; uygulamadan çıkmak da öyle.",
  },

  device: {
    hardwareLegend: "Donanım",
    identityTitle: "Kimlik",
    simulatedDescription:
      "Simüle cihaz — bu değerler sabittir, donanımdan okunmaz.",
    realDescription: "Bağlı cihazdan okundu.",
    scanning: "Aranıyor",
    rescan: "Yeniden ara",
    product: "Ürün",
    vendorId: "Üretici kimliği",
    productId: "Ürün kimliği",
    connection: "Bağlantı",
    serial: "Seri numarası",
    firmware: "Yazılım sürümü",
    revision: "Donanım revizyonu",
    source: "Kaynak",
    simulated: "Simüle",
    physical: "Fiziksel cihaz",
    notAvailable: "Yok",
    nothingToReport: "Bağlı cihaz yok, bu yüzden bildirilecek bir şey de yok.",
    naExplain:
      "Yok olarak işaretlenen alanlar bu kulaklığın kontrol arayüzünde sunulmuyor. Bir ürün veritabanından doldurmak yerine boş bırakılıyorlar.",

    detectedLegend: "Bulunanlar",
    detectedTitle: "Bu sistemdeki cihazlar",
    detectedDescription:
      "Bulunan tüm desteklenen cihazlar — şu anda açılamayanlar dâhil.",
    scanningEllipsis: "Aranıyor…",
    nothingFound: "Hiçbir şey bulunamadı.",
    available: "Kullanılabilir",
    connect: "Bağlan",
    connected: "Bağlı",

    powerLegend: "Güç",
    autoShutOffTitle: "Otomatik kapanma",
    autoShutOffDescription:
      "Kulaklığın, ses ve hareket olmadığında pil tasarrufu için kendini kapatmadan önce ne kadar bekleyeceği.",
    idleTimeout: "Boşta kalma süresi",
    never: "Hiçbir zaman",
    minutes: (count: number) => `${count} dk`,
    autoShutOffDetail: (max: number) =>
      `Kulaklık 0 ile ${max} dakika arasını kabul ediyor. Sıfır, sayacı tamamen devre dışı bırakır.`,
    autoShutOffUnknown:
      "Kulaklık mevcut süresini bildirmiyor, bu yüzden yeniden bağlantıdan sonra sıfırdan başlar ve o andan itibaren bu uygulamanın gönderdiğini gösterir.",

    capabilitiesLegend: "Yetenekler",
    capabilitiesTitle: "Bu cihazın yapabildikleri",
    capabilitiesDescription:
      "Donanımın bildirdiği; model adından varsayılan değil.",
    supported: "destekleniyor",
    unsupported: "desteklenmiyor",
  },

  settings: {
    settingFailed: "Bu ayar uygulanmadı",

    startupLegend: "Başlangıç",
    startupTitle: "Başlatma",
    startWithSystem: "Sistemle birlikte başlat",
    startWithSystemDetail:
      "Otomatik başlatma dizininize bir masaüstü girdisi ekler. Sistem geneline hiçbir şey kurulmaz.",
    startMinimised: "Tepside başlat",
    startMinimisedDetail: "Pencereyi açmadan başlat.",
    startMinimisedDisabled:
      "Uygulama sistemle birlikte başladığında kullanılabilir.",
    closeToTray: "Pencereyi kapatmak uygulamayı çalışır durumda bırakır",
    closeToTrayDetail:
      "Kulaklık okunmaya devam eder ve tepsi girdisi kullanılabilir kalır. Tamamen durdurmak için tepsi menüsünden çıkın.",

    languageLegend: "Dil",
    languageTitle: "Arayüz dili",
    languageDescription:
      "Tepsi menüsü ve bildirimler dâhil, hemen uygulanır.",
    systemLanguage: "Sistemi izle",
    languageNote:
      "Cihazdan gelen okumalar hiçbir zaman çevrilmez: desibel desibeldir, model adı da donanımın kendine verdiği addır.",

    alertsLegend: "Uyarılar",
    alertsTitle: "Bildirimler",
    lowBattery: "Pil azaldığında uyar",
    lowBatteryDetail:
      "Seviye eşiğin altına düştüğünde bir kez gösterilir, tekrar tekrar değil.",
    threshold: "Eşik",
    thresholdNote:
      "Yalnızca bu ikisi sunuluyor, çünkü kulaklık beş kademe bildiriyor — yüzde 0, 25, 50, 75 ve 100. %30'luk bir eşik, cihazın hiç göndermeyeceği bir sayıyı beklemek olurdu.",

    developmentLegend: "Geliştirme",
    simulatedTitle: "Simüle cihaz",
    simulatedDescription: "Donanım bağlı değilken arayüz üzerinde çalışmak için.",
    useSimulated: "Simüle cihaz kullan",
    useSimulatedDetail:
      "Kulaklığın yerine, aynı yetenekleri ve aynı çözünürlüğü bildiren bir vekil koyar. Her okuma açıkça simüle olarak işaretlenir.",
    simulationOnTitle: "Simülasyon açık",
    simulationOnBody:
      "Bu açıkken hiçbir fiziksel kulaklık okunmuyor veya yazılmıyor.",

    supportLegend: "Destek",
    diagnosticsTitle: "Tanılama",
    diagnosticsDescription:
      "Bu uygulamanın görebildiklerinin düz metin raporu; hata bildirimine eklemek için.",
    writeReport: "Rapor yaz",
    writtenTo: "Şuraya yazıldı:",
    diagnosticsBody:
      "Cihaz tanımlayıcılarını, yetenekleri, son okumaları ve ayarlarınızı içerir. Sizinle ilgili hiçbir şey içermez ve hiçbir yere gönderilmez — dosya bu makinede kalır.",

    aboutLegend: "Uygulama",
    aboutTitle: "Hakkında",
    aboutBody1:
      "Desteklenen kulaklıkları doğrudan USB üzerinden kontrol eden yerel bir uygulama. Hiçbir şey hiçbir yere gönderilmez: hesap yok, telemetri yok, ağ bağlantısı yok.",
    aboutBody2:
      "Cihaz desteği herkese açık belgelenmiş protokollere dayanır. Bir komut donanımda doğrulanmadıysa, tahmine dayalı olarak yayınlanmak yerine desteklenmiyor olarak işaretlenir.",
    version: (version: string) => `Sürüm ${version} · Linux`,
    versionUnavailable: "Sürüm bilinmiyor · Linux",
    loading: "Yükleniyor…",
  },

  capabilities: {
    batteryLevel: "Pil seviyesi",
    batteryLevelDetail: (steps: number) =>
      `${steps} ayrık kademe (%0 / 25 / 50 / 75 / 100)`,
    batteryLevelAbsent: "Bu cihaz tarafından bildirilmiyor",
    chargingState: "Şarj durumu",
    chargingStateDetail: "Kablo takılıyken bildirilir",
    chatmix: "ChatMix çarkı",
    chatmixDetail: "Salt okunur — çark kulaklığın üzerinde",
    chatmixAbsent: "Bu cihazda yok",
    sidetone: "Sidetone",
    sidetoneDetail: (count: number, labels: string) =>
      `${count} donanım kademesi: ${labels}`,
    sidetoneAbsent: "Bu cihazda ayarlanamıyor",
    equaliser: "Ekolayzer",
    equaliserDetail: (bands: number, min: number, max: number, step: number) =>
      `${bands} bant, ${min} ile +${max} dB arası, ${step} dB adımlarla`,
    equaliserHardware: " — kulaklığın kendisi uyguluyor",
    equaliserAbsent: "Bu cihazda yok",
    presets: "Ekolayzer hazır ayarları",
    presetsAbsent: "Kayıtlı hazır ayar yok",
    inactiveTime: "Otomatik kapanma sayacı",
    inactiveTimeDetail: (max: number) => `En fazla ${max} dakika`,
    inactiveTimeAbsent: "Bu cihazda ayarlanamıyor",
    volume: "Çıkış sesi",
    volumeDetail: "USB ses donanımı seviyesi",
    mute: "Çıkış susturma",
    muteDetail: "USB ses donanımı susturma",
    notExposed: "Bu cihaz tarafından sunulmuyor",
    micVolume: "Mikrofon seviyesi",
    micVolumeDetail: "USB ses kayıt kazancı",
    micMute: "Mikrofon susturma",
    micMuteDetail: "USB ses kayıt susturma",
    softwareProfiles: "Yazılım profilleri",
    softwareProfilesDetail:
      "Bu uygulama tarafından saklanır ve istendiğinde kulaklığa gönderilir",
    onboardProfiles: "Cihaz üstü profil hafızası",
    onboardProfilesDetail: "Ayarlar kulaklıkta kalıcıdır",
    onboardProfilesAbsent:
      "Kulaklık profil saklayamıyor, dolayısıyla ona kaydedilecek bir şey de yok",
    firmware: "Yazılım güncelleme",
    firmwareAbsent: "Bu cihaz için belgelenmiş bir güncelleme yolu yok",
    rgb: "RGB aydınlatma",
    rgbAbsent: "Bu kulaklıkta adreslenebilir aydınlatma yok",
    spatial: "Uzamsal ses",
    spatialAbsent: "Burada bir donanım özelliği değil",
    noiseReduction: "Donanımsal gürültü azaltma",
    noiseReductionAbsent:
      "Cihazda mikrofon kapısı, kompresör veya limitleyici yok",
    supported: "Destekleniyor",
    notAvailable: "Mevcut değil",
  },

  terms: {
    off: "Kapalı",
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
    flat: "Düz",
    bassboost: "Bas Vurgulu",
    smiley: "Gülen Yüz",
    focus: "Odak",
  },

  errors: {
    unsupported: "Bu özellik cihazınız tarafından desteklenmiyor.",
    busy: "Cihazı şu anda başka bir uygulama kontrol ediyor.",
    offline: "Kulaklık kapalı.",
    notConnected: "Bağlı cihaz yok.",
    transport: "Cihazla iletişim kurulamıyor.",
    protocol: "Cihaz beklenmeyen bir yanıt gönderdi.",
    invalidParameter: "Bu değer cihazın kabul ettiği aralığın dışında.",
    failed: (action: string) => `${action} başarısız oldu.`,
  },

  actions: {
    settingVolume: "Ses ayarlanıyor",
    changingMute: "Susturma değiştiriliyor",
    settingMicLevel: "Mikrofon seviyesi ayarlanıyor",
    changingMicMute: "Mikrofon susturması değiştiriliyor",
    settingSidetone: "Sidetone ayarlanıyor",
    settingEqualiser: "Ekolayzer ayarlanıyor",
    applyingPreset: "Ekolayzer hazır ayarı uygulanıyor",
    settingAutoShutOff: "Otomatik kapanma sayacı ayarlanıyor",
    readingState: "Cihaz durumu okunuyor",
    scanning: "Cihaz aranıyor",
    connecting: "Bağlanılıyor",
  },

  tray: {
    noDevice: "Cihaz bulunamadı",
    batteryUnknown: "Pil: —",
    batteryNotReported: "Pil: bildirilmiyor",
    battery: "Pil: %{percent}",
    batteryCharging: "Pil: %{percent} · şarj oluyor",
    muteOutput: "Sesi sustur",
    unmuteOutput: "Sesi aç",
    muteMicrophone: "Mikrofonu sustur",
    unmuteMicrophone: "Mikrofonu aç",
    open: "Headset Control Center'ı aç",
    quit: "Çık",
    lowBatteryTitle: "{device} pili azaldı",
    lowBatteryBody: "%{percent} kaldı.",
  },
};
