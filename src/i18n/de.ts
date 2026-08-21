import type { Catalog } from "./en";

/**
 * German.
 *
 * Messwerte und alles, was das Gerät selbst meldet, bleiben unübersetzt: ein
 * Dezibel ist ein Dezibel, und ein Modellname ist der Name, den die Hardware
 * sich selbst gibt. Übersetzt wird, was die Anwendung sagt.
 */
export const de: Catalog = {
  meta: { name: "Deutsch" },

  app: {
    name: "Headset Control Center",
    tagline: "Lokal · Offen",
    sections: "Bereiche",
    connection: "Verbindung",
    noDeviceDetected: "Kein Gerät erkannt",
    lookingForDevices: "Suche nach Geräten",
    commandFailed: "Gerätebefehl fehlgeschlagen",
    dismiss: "Schließen",
  },

  nav: {
    dashboard: "Übersicht",
    audio: "Audio",
    microphone: "Mikrofon",
    equaliser: "Equalizer",
    profiles: "Profile",
    device: "Gerät",
    settings: "Einstellungen",
  },

  connection: {
    connected: "Verbunden",
    disconnected: "Nicht verbunden",
    connecting: "Verbinde",
    reconnecting: "Verbinde erneut",
    unknown: "Unbekannt",
    error: "Fehler",
  },

  strip: {
    device: "Gerät",
    link: "Verbindung",
    battery: "Akku",
    chatmix: "ChatMix",
    noDevice: "Kein Gerät",
    poweredOn: "Headset eingeschaltet",
    poweredOff: "Headset ausgeschaltet",
    charging: "Lädt",
    reportedLevels: (count: number) => `${count} gemeldete Stufen`,
    notSupported: "Nicht unterstützt",
    notReportedWhileOff: "Im ausgeschalteten Zustand nicht gemeldet",
  },

  empty: {
    title: "Kein kompatibles Gerät erkannt",
    lede:
      "Zurzeit ist nichts angeschlossen, womit diese Anwendung sprechen kann.",
    hints: [
      "Prüfen Sie, ob der Funkempfänger eingesteckt ist.",
      "Schalten Sie das Headset ein und warten Sie einige Sekunden, bis es sich verbindet.",
      "Schließen Sie andere Software, die das Headset steuert — nur eine Anwendung kann das Gerät gleichzeitig belegen.",
    ],
    scanning: "Suche läuft",
    scanAgain: "Erneut suchen",
    useSimulated: "Simuliertes Gerät verwenden",
  },

  conflict: {
    title: (name: string) => `${name} ist verbunden, lässt sich aber nicht öffnen`,
    useSimulatedInstead: "Stattdessen mit einem simulierten Gerät arbeiten",
    explain:
      "Eine andere Anwendung belegt die Steuerschnittstelle. Auf diesem System ist das meist ein Hintergrunddienst; ihn zu beenden gibt das Headset frei:",
    nothingChanged:
      "An Ihrem System wurde nichts verändert — führen Sie den Befehl selbst aus, wenn diese Anwendung übernehmen soll, und aktivieren Sie den Dienst später wieder mit:",
  },

  dashboard: {
    hostErrorTitle: "Kein Hardwarezugriff",
    simulatedTitle: "Simuliertes Gerät",
    simulatedBody:
      "Diese Werte stammen von der Anwendung, nicht von einem Headset. Schalten Sie das in den Einstellungen ab, sobald echte Hardware angeschlossen ist.",

    controlsLegend: "Bedienung",
    controlsTitle: "Schnellzugriff",
    outputVolume: "Ausgabelautstärke",
    hardwareSteps: (count: number) => `${count} Hardwarestufen`,
    mute: "Stumm",
    unmute: "Ton an",
    muteMic: "Mikro stumm",
    unmuteMic: "Mikro an",
    sidetone: "Sidetone",

    powerLegend: "Energie",
    batteryTitle: "Akku",
    chargingOverUsb: "Lädt über USB",
    lowChargeSoon: "Niedrig — bald laden",
    runningOnBattery: "Akkubetrieb",
    batteryResolution: (levels: number) =>
      `Das Headset meldet ${levels} Stufen statt eines Prozentwerts, deshalb springt diese Zahl. Sie ist das, was das Gerät gesendet hat, keine Schätzung.`,
    batteryOff:
      "Das Headset ist ausgeschaltet und meldet deshalb keinen Akkustand.",
    batteryUnsupported: "Dieses Gerät meldet keinen Akkustand.",

    mixLegend: "Mischung",
    chatmixTitle: "ChatMix",
    game: "Spiel",
    chat: "Chat",
    chatmixExplain:
      "Das Rad sitzt am Headset selbst. Hier ist nur zu sehen, wo es steht; verstellen lässt es sich von hier nicht.",
    chatmixOff:
      "Das Headset ist ausgeschaltet, deshalb wird die Radstellung nicht gemeldet.",
    chatmixUnsupported: "Dieses Gerät hat kein ChatMix-Rad.",

    statusLegend: "Status",
    liveTitle: "Aktuelle Messwerte",
    liveDescription: "Zuletzt vom Gerät empfangene Werte.",
    power: "Betrieb",
    on: "An",
    off: "Aus",
    autoShutOff: "Abschaltautomatik",
    equaliser: "Equalizer",
    minutes: (count: number) => `${count} Min.`,
    custom: "Eigen",
    notReadBack: "Nicht auslesbar",
    notSupported: "Nicht unterstützt",
    notReadBackExplain:
      '„Nicht auslesbar“ heißt: Das Headset nimmt die Einstellung an, bietet aber keine Möglichkeit, den aktuellen Wert abzufragen. Hier steht, was ihm gesagt wurde; nach einer neuen Verbindung steht hier nichts, statt zu raten.',
  },

  audio: {
    noDeviceTitle: "Kein Gerät verbunden",
    noDeviceBody:
      "Schließen Sie ein Headset an, um seine Lautstärke zu steuern.",
    noControlTitle: "Keine Lautstärkeregelung an diesem Gerät",
    cardUnreadable: "Die Audiokarte des Geräts konnte nicht gelesen werden.",
    noHardwareVolume:
      "Dieses Headset bietet keine Lautstärkeregelung in der Hardware.",

    outputLegend: "Ausgabe",
    volumeTitle: "Lautstärke",
    volumeDescription:
      "Die Lautstärke des Headsets selbst — dieselbe Regelung wie das Rad an der Muschel.",
    muted: "Stumm",
    mute: "Stumm schalten",
    gain: "Pegel",
    outputLevel: "Ausgabepegel",
    levelDetail: (steps: number) =>
      `${steps} Hardwarestufen. Das ändert das Headset für jede Anwendung, nicht nur für diese.`,
    mutedTitle: "Ausgabe ist stumm",
    mutedBody:
      "Solange das Headset stumm ist, ist die Pegelregelung deaktiviert.",

    notAvailableLegend: "Nicht verfügbar",
    notAvailableTitle: "Was dieses Gerät nicht kann",
    absent: [
      {
        name: "Lautstärkebegrenzung",
        detail: "In der Hardware gibt es keine Pegelbegrenzung.",
      },
      { name: "Raumklang", detail: "Keine Funktion dieses Headsets." },
      {
        name: "Software-Equalizer",
        detail:
          "Den Equalizer wendet das Headset selbst an — siehe die Seite Equalizer.",
      },
    ],
  },

  microphone: {
    noDeviceTitle: "Kein Gerät verbunden",
    noDeviceBody:
      "Schließen Sie ein Headset an, um sein Mikrofon zu steuern.",

    inputLegend: "Eingang",
    title: "Mikrofon",
    description: "Der Aufnahmepegel in der Audiohardware des Headsets.",
    muted: "Stumm",
    mute: "Stumm schalten",
    gain: "Pegel",
    captureLevel: "Aufnahmepegel",
    levelDetail: (steps: number) => `${steps} Hardwarestufen.`,
    mutedTitle: "Mikrofon ist stumm",
    mutedBody:
      "Es wird nichts aufgenommen. Das ist die Hardware-Stummschaltung und gilt deshalb für jede Anwendung.",
    noControl: "Dieses Gerät bietet keine Mikrofonregelung.",

    monitoringLegend: "Mithören",
    sidetoneTitle: "Sidetone",
    sidetoneDescription:
      "Wie viel von Ihrer eigenen Stimme das Headset Ihnen zurückspielt.",
    level: "Stufe",
    sidetoneSteps: (count: number) =>
      `Das Headset speichert ${count} Stellungen, das ist also ein Schalter und kein Regler.`,
    sidetoneUnknown:
      " Welche gerade eingestellt ist, meldet es nicht — die Auswahl erscheint hier, sobald Sie eine treffen.",
    sidetoneUnsupported: "Dieses Gerät hat keine Sidetone-Regelung.",

    processingLegend: "Nicht verfügbar",
    processingTitle: "Mikrofonbearbeitung",
    processingBody:
      "Dieses Headset bearbeitet das Mikrofonsignal nicht. Nichts davon existiert in seiner Hardware, und diese Anwendung wird es nicht in Software nachbilden und als Gerätefunktion ausgeben:",
    processingList: [
      "Rauschunterdrückung",
      "Noise Gate",
      "Kompressor",
      "Limiter",
      "Stimmoptimierung",
      "Mikrofon-Stumm-LED",
    ],
  },

  equaliser: {
    unavailableTitle: "Kein Equalizer verfügbar",
    noEqualiser: "Dieses Gerät hat keinen Equalizer.",
    connectFirst:
      "Schließen Sie ein Headset an, um seinen Equalizer einzustellen.",

    toneLegend: "Klang",
    title: "Equalizer",
    hardwareDescription:
      "Wird vom Headset selbst angewendet — er bleibt für jede Anwendung aktiv und auch überall sonst, wo dieses Headset angeschlossen wird.",
    softwareDescription: "Wird von dieser Anwendung angewendet.",
    flat: "Neutral",
    presets: "Voreinstellungen",
    custom: "Eigen",
    bandLabel: (frequency: string) => `Band ${frequency}`,
    bandValue: (decibels: string, frequency: string) =>
      `${decibels} Dezibel bei ${frequency}`,
    range: (bands: number, min: number, max: number, step: number) =>
      `${bands} Bänder · ${min} bis +${max} dB · Schritte von ${step} dB`,
    frequenciesAreLabels:
      "Die Bandfrequenzen sind Beschriftungen: Das Headset nimmt zehn Verstärkungswerte nach Position entgegen und benennt sie nie, deshalb folgen diese der üblichen Zehnband-Aufteilung.",
    noReadBackTitle: "Das Headset meldet seine Kurve nicht",
    noReadBackBody:
      "Es gibt keinen Befehl, um dieses Gerät nach seiner aktuellen Equalizer-Einstellung zu fragen. Nach einer neuen Verbindung stehen die Regler neutral und zeigen, was diese Anwendung seitdem gesendet hat — nicht zwingend das, was das Headset anwendet. Eine Voreinstellung zu wählen oder einen Regler zu bewegen bringt beides in Übereinstimmung.",
  },

  profiles: {
    savedLegend: "Gespeichert",
    title: "Profile",
    description:
      "Einstellungen, die diese Anwendung aufbewahrt und auf Wunsch an das Headset sendet.",
    saveAs: "Aktuelle Einstellungen speichern als",
    placeholder: "Spät abends, Telefonat, Spiele…",
    save: "Speichern",
    noDeviceTitle: "Kein Gerät verbunden",
    noDeviceBody:
      "Profile lassen sich nur anwenden und bearbeiten, solange ein Headset verbunden ist — sonst gibt es nichts, woraus die aktuellen Einstellungen zu lesen wären.",
    failedTitle: "Das hat nicht geklappt",
    empty:
      "Noch keine Profile. Stellen Sie das Headset so ein, wie Sie es möchten, und speichern Sie es hier.",
    lastApplied: "zuletzt angewendet",
    nothingStored: "Nichts gespeichert",
    apply: "Anwenden",
    rename: (name: string) => `${name} umbenennen`,
    remove: (name: string) => `${name} löschen`,
    confirmRename: "Umbenennen bestätigen",
    cancelRename: "Umbenennen abbrechen",

    resultLegend: "Ergebnis",
    resultTitle: (name: string) => `„${name}“ angewendet`,
    sent: (settings: string) => `An das Headset gesendet: ${settings}.`,
    nothingSent:
      "Dieses Profil enthält keine Einstellungen, es wurde also nichts gesendet.",

    howLegend: "Wie das funktioniert",
    howTitle: "Profile liegen hier, nicht auf dem Headset",
    howBody1:
      "Dieses Headset hat keinen eigenen Speicher für Einstellungen, deshalb gibt es hier keine Schaltfläche „Auf Gerät speichern“ — einen solchen Befehl kennt sein Protokoll nicht. Ein Profil anzuwenden heißt, jede Einstellung einzeln an das Gerät zu senden, genau so, als hätten Sie sie von Hand gesetzt.",
    howBody2:
      "Das heißt auch: Das Headset kann über seine eigenen Bedienelemente verändert werden, ohne dass diese Anwendung davon erfährt. Ein als zuletzt angewendet markiertes Profil ist ein Protokoll dessen, was gesendet wurde, keine Aussage darüber, was die Hardware gerade tut.",

    contents: {
      volume: "Lautstärke",
      muted: "Stumm",
      unmuted: "Ton an",
      micLevel: "Mikrofonpegel",
      micMuted: "Mikrofon stumm",
      micLive: "Mikrofon an",
      sidetone: "Sidetone",
      autoShutOff: "Abschaltautomatik",
      equaliserCurve: "Equalizer-Kurve",
      equaliserPreset: "Equalizer-Voreinstellung",
    },
  },

  device: {
    hardwareLegend: "Hardware",
    identityTitle: "Identität",
    simulatedDescription:
      "Ein simuliertes Gerät — diese Werte sind fest, nicht aus Hardware gelesen.",
    realDescription: "Vom verbundenen Gerät gelesen.",
    scanning: "Suche läuft",
    rescan: "Erneut suchen",
    product: "Produkt",
    vendorId: "Hersteller-ID",
    productId: "Produkt-ID",
    connection: "Anschluss",
    serial: "Seriennummer",
    firmware: "Firmwareversion",
    revision: "Hardwarerevision",
    source: "Quelle",
    simulated: "Simuliert",
    physical: "Physisches Gerät",
    notAvailable: "—",
    nothingToReport:
      "Es ist kein Gerät verbunden, also gibt es nichts zu berichten.",
    naExplain:
      "Mit — gekennzeichnete Felder gibt dieses Headset über seine Steuerschnittstelle nicht preis. Sie bleiben leer, statt aus einer Produktdatenbank gefüllt zu werden.",

    detectedLegend: "Erkannt",
    detectedTitle: "Geräte an diesem System",
    detectedDescription:
      "Alle gefundenen unterstützten Geräte, auch die, die sich zurzeit nicht öffnen lassen.",
    scanningEllipsis: "Suche läuft…",
    nothingFound: "Nichts gefunden.",
    available: "Verfügbar",
    connect: "Verbinden",
    connected: "Verbunden",

    powerLegend: "Energie",
    autoShutOffTitle: "Abschaltautomatik",
    autoShutOffDescription:
      "Wie lange das Headset ohne Ton und ohne Bewegung wartet, bevor es sich zum Schonen des Akkus abschaltet.",
    idleTimeout: "Leerlaufzeit",
    never: "Nie",
    minutes: (count: number) => `${count} Min.`,
    autoShutOffDetail: (max: number) =>
      `Das Headset nimmt 0 bis ${max} Minuten an. Null schaltet die Automatik ganz ab.`,
    autoShutOffUnknown:
      "Das Headset meldet seine aktuelle Zeit nicht, deshalb beginnt sie nach einer neuen Verbindung bei null und zeigt, was diese Anwendung seitdem gesendet hat.",

    capabilitiesLegend: "Fähigkeiten",
    capabilitiesTitle: "Was dieses Gerät kann",
    capabilitiesDescription:
      "Von der Hardware gemeldet, nicht aus dem Modellnamen abgeleitet.",
    supported: "unterstützt",
    unsupported: "nicht unterstützt",
  },

  settings: {
    settingFailed: "Diese Einstellung wurde nicht übernommen",

    startupLegend: "Start",
    startupTitle: "Starten",
    startWithSystem: "Mit dem System starten",
    startWithSystemDetail:
      "Legt einen Autostart-Eintrag in Ihrem Benutzerverzeichnis an. Systemweit wird nichts installiert.",
    startMinimised: "Im Infobereich starten",
    startMinimisedDetail: "Starten, ohne das Fenster zu öffnen.",
    startMinimisedDisabled:
      "Verfügbar, sobald die Anwendung mit dem System startet.",
    closeToTray: "Fenster schließen beendet die Anwendung nicht",
    closeToTrayDetail:
      "Das Headset wird weiter ausgelesen und der Eintrag im Infobereich bleibt verfügbar. Zum vollständigen Beenden das Menü im Infobereich verwenden.",

    languageLegend: "Sprache",
    languageTitle: "Sprache der Oberfläche",
    languageDescription:
      "Wirkt sofort, auch im Infobereich und in Benachrichtigungen.",
    systemLanguage: "Dem System folgen",
    languageNote:
      "Messwerte vom Gerät werden nie übersetzt: Ein Dezibel ist ein Dezibel, und ein Modellname ist der Name, den die Hardware sich selbst gibt.",

    alertsLegend: "Hinweise",
    alertsTitle: "Benachrichtigungen",
    lowBattery: "Warnen, wenn der Akku zur Neige geht",
    lowBatteryDetail:
      "Wird einmal angezeigt, wenn der Stand unter die Schwelle fällt, nicht wiederholt.",
    threshold: "Schwelle",
    thresholdNote:
      "Nur diese beiden werden angeboten, weil das Headset fünf Stufen meldet — 0, 25, 50, 75 und 100 Prozent. Eine Schwelle von 30 % würde auf eine Zahl warten, die das Gerät nie sendet.",

    developmentLegend: "Entwicklung",
    simulatedTitle: "Simuliertes Gerät",
    simulatedDescription:
      "Um an der Oberfläche zu arbeiten, ohne Hardware anzuschließen.",
    useSimulated: "Simuliertes Gerät verwenden",
    useSimulatedDetail:
      "Ersetzt das Headset durch einen Platzhalter, der dieselben Fähigkeiten und dieselbe Auflösung meldet. Jeder Wert ist deutlich als simuliert gekennzeichnet.",
    simulationOnTitle: "Simulation ist aktiv",
    simulationOnBody:
      "Solange das aktiv ist, wird kein physisches Headset gelesen oder beschrieben.",

    supportLegend: "Unterstützung",
    diagnosticsTitle: "Diagnose",
    diagnosticsDescription:
      "Ein Textbericht darüber, was diese Anwendung sieht — zum Anhängen an eine Fehlermeldung.",
    writeReport: "Bericht schreiben",
    writtenTo: "Geschrieben nach",
    diagnosticsBody:
      "Enthält Gerätekennungen, Fähigkeiten, die letzten Messwerte und Ihre Einstellungen. Nichts über Sie, und nichts wird irgendwohin gesendet — die Datei bleibt auf diesem Rechner.",

    aboutLegend: "Anwendung",
    aboutTitle: "Über",
    aboutBody1:
      "Eine lokale Anwendung, die unterstützte Headsets direkt über USB steuert. Nichts wird irgendwohin gesendet: kein Konto, keine Telemetrie, keine Netzwerkverbindung.",
    aboutBody2:
      "Die Geräteunterstützung baut auf öffentlich dokumentierten Protokollen auf. Wo ein Befehl nicht an Hardware überprüft wurde, gilt die Funktion als nicht unterstützt, statt auf Verdacht ausgeliefert zu werden.",
    version: (version: string) => `Version ${version} · Linux`,
    versionUnavailable: "Version unbekannt · Linux",
    loading: "Wird geladen…",
  },

  capabilities: {
    batteryLevel: "Akkustand",
    batteryLevelDetail: (steps: number) =>
      `${steps} diskrete Stufen (0 / 25 / 50 / 75 / 100 %)`,
    batteryLevelAbsent: "Von diesem Gerät nicht gemeldet",
    chargingState: "Ladezustand",
    chargingStateDetail: "Wird gemeldet, solange das Kabel angeschlossen ist",
    chatmix: "ChatMix-Rad",
    chatmixDetail: "Nur lesbar — das Rad sitzt am Headset",
    chatmixAbsent: "An diesem Gerät nicht vorhanden",
    sidetone: "Sidetone",
    sidetoneDetail: (count: number, labels: string) =>
      `${count} Hardwarestufen: ${labels}`,
    sidetoneAbsent: "An diesem Gerät nicht einstellbar",
    equaliser: "Equalizer",
    equaliserDetail: (bands: number, min: number, max: number, step: number) =>
      `${bands} Bänder, ${min} bis +${max} dB in Schritten von ${step} dB`,
    equaliserHardware: " — vom Headset selbst angewendet",
    equaliserAbsent: "An diesem Gerät nicht verfügbar",
    presets: "Equalizer-Voreinstellungen",
    presetsAbsent: "Keine gespeicherten Voreinstellungen",
    inactiveTime: "Abschaltautomatik",
    inactiveTimeDetail: (max: number) => `Bis zu ${max} Minuten`,
    inactiveTimeAbsent: "An diesem Gerät nicht einstellbar",
    volume: "Ausgabelautstärke",
    volumeDetail: "Lautstärke der USB-Audiohardware",
    mute: "Ausgabe stumm",
    muteDetail: "Stummschaltung der USB-Audiohardware",
    notExposed: "Von diesem Gerät nicht bereitgestellt",
    micVolume: "Mikrofonpegel",
    micVolumeDetail: "Aufnahmepegel der USB-Audiohardware",
    micMute: "Mikrofon stumm",
    micMuteDetail: "Aufnahme-Stummschaltung der USB-Audiohardware",
    softwareProfiles: "Softwareprofile",
    softwareProfilesDetail:
      "Von dieser Anwendung gespeichert und bei Bedarf an das Headset gesendet",
    onboardProfiles: "Profilspeicher im Gerät",
    onboardProfilesDetail: "Einstellungen bleiben im Headset erhalten",
    onboardProfilesAbsent:
      "Das Headset kann keine Profile speichern, es gibt also nichts, was sich darauf sichern ließe",
    firmware: "Firmware-Aktualisierung",
    firmwareAbsent: "Für dieses Gerät ist kein Aktualisierungsweg dokumentiert",
    rgb: "RGB-Beleuchtung",
    rgbAbsent: "Dieses Headset hat keine ansteuerbare Beleuchtung",
    spatial: "Raumklang",
    spatialAbsent: "Hier keine Hardwarefunktion",
    noiseReduction: "Rauschunterdrückung in Hardware",
    noiseReductionAbsent:
      "Kein Noise Gate, kein Kompressor und kein Limiter im Gerät",
    supported: "Unterstützt",
    notAvailable: "Nicht verfügbar",
  },

  terms: {
    off: "Aus",
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch",
    flat: "Neutral",
    bassboost: "Bassanhebung",
    smiley: "Badewanne",
    focus: "Fokus",
  },

  errors: {
    unsupported: "Diese Funktion unterstützt Ihr Gerät nicht.",
    busy: "Zurzeit steuert eine andere Anwendung das Gerät.",
    offline: "Das Headset ist ausgeschaltet.",
    notConnected: "Es ist kein Gerät verbunden.",
    transport: "Keine Kommunikation mit dem Gerät möglich.",
    protocol: "Das Gerät hat unerwartet geantwortet.",
    invalidParameter: "Dieser Wert liegt außerhalb dessen, was das Gerät annimmt.",
    failed: (action: string) => `${action} fehlgeschlagen.`,
  },

  actions: {
    settingVolume: "Lautstärke einstellen",
    changingMute: "Stummschaltung ändern",
    settingMicLevel: "Mikrofonpegel einstellen",
    changingMicMute: "Mikrofon-Stummschaltung ändern",
    settingSidetone: "Sidetone einstellen",
    settingEqualiser: "Equalizer einstellen",
    applyingPreset: "Equalizer-Voreinstellung anwenden",
    settingAutoShutOff: "Abschaltautomatik einstellen",
    readingState: "Gerätestatus lesen",
    scanning: "Nach Geräten suchen",
    connecting: "Verbinden",
  },

  tray: {
    noDevice: "Kein Gerät erkannt",
    batteryUnknown: "Akku: —",
    batteryNotReported: "Akku: nicht gemeldet",
    battery: "Akku: {percent} %",
    batteryCharging: "Akku: {percent} % · lädt",
    muteOutput: "Ton stumm schalten",
    unmuteOutput: "Ton einschalten",
    muteMicrophone: "Mikrofon stumm schalten",
    unmuteMicrophone: "Mikrofon einschalten",
    open: "Headset Control Center öffnen",
    quit: "Beenden",
    lowBatteryTitle: "Akku von {device} ist fast leer",
    lowBatteryBody: "{percent} % verbleiben.",
  },
};
