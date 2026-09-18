import type { Catalog } from "./en";

/**
 * French.
 *
 * Les mesures et tout ce que l'appareil rapporte lui-même ne sont pas
 * traduits : un décibel est un décibel, et le nom d'un modèle est celui que le
 * matériel se donne. Ce qui est traduit, c'est ce que l'application dit.
 */
export const fr: Catalog = {
  meta: { name: "Français" },

  app: {
    name: "Gear Control Center",
    tagline: "Local · Ouvert",
    sections: "Sections",
    connection: "Connexion",
    noDeviceDetected: "Aucun appareil détecté",
    lookingForDevices: "Recherche d'appareils",
    commandFailed: "La commande envoyée à l'appareil a échoué",
    dismiss: "Fermer",
  },

  nav: {
    sensor: "Capteur",
    lighting: "Éclairage",
    dashboard: "Tableau de bord",
    audio: "Audio",
    microphone: "Microphone",
    equaliser: "Égaliseur",
    profiles: "Profils",
    device: "Appareil",
    settings: "Réglages",
  },

  connection: {
    connected: "Connecté",
    disconnected: "Déconnecté",
    connecting: "Connexion",
    reconnecting: "Reconnexion",
    unknown: "Inconnu",
    error: "Erreur",
  },

  strip: {
    device: "Appareil",
    link: "Liaison",
    battery: "Batterie",
    chatmix: "ChatMix",
    noDevice: "Aucun appareil",
    poweredOn: "Casque allumé",
    poweredOff: "Casque éteint",
    charging: "En charge",
    reportedLevels: (count: number) => `${count} niveaux rapportés`,
    notSupported: "Non pris en charge",
    notReportedWhileOff: "Non rapporté lorsque le casque est éteint",
  },

  empty: {
    title: "Aucun appareil compatible détecté",
    lede:
      "Rien de ce que cette application sait piloter n'est connecté pour le moment.",
    hints: [
      "Vérifiez que le récepteur sans fil est branché.",
      "Allumez le casque et patientez quelques secondes le temps de l'appairage.",
      "Fermez tout autre logiciel qui pilote le casque : une seule application peut détenir l'appareil à la fois.",
    ],
    scanning: "Recherche",
    scanAgain: "Rechercher à nouveau",
    useSimulated: "Utiliser un appareil simulé",
  },

  conflict: {
    title: (name: string) => `${name} est connecté mais ne peut pas être ouvert`,
    useSimulatedInstead: "Travailler plutôt avec un appareil simulé",
    explain:
      "Une autre application détient l'interface de contrôle. Sur ce système, il s'agit le plus souvent d'un service en arrière-plan ; l'arrêter libère le casque :",
    nothingChanged:
      "Rien n'a été modifié sur votre système — lancez cette commande vous-même si vous voulez que cette application prenne la main, puis réactivez le service ensuite avec :",
  },

  dashboard: {
    hostErrorTitle: "Accès au matériel indisponible",
    simulatedTitle: "Appareil simulé",
    simulatedBody:
      "Ces valeurs sont produites par l'application, pas par un casque. Désactivez-le dans les Réglages une fois le matériel réel connecté.",

    controlsLegend: "Commandes",
    controlsTitle: "Commandes rapides",
    outputVolume: "Volume de sortie",
    hardwareSteps: (count: number) => `${count} crans matériels`,
    mute: "Couper",
    unmute: "Rétablir",
    muteMic: "Couper le micro",
    unmuteMic: "Rétablir le micro",
    sidetone: "Sidetone",

    powerLegend: "Alimentation",
    batteryTitle: "Batterie",
    chargingOverUsb: "En charge via USB",
    lowChargeSoon: "Faible — à recharger bientôt",
    runningOnBattery: "Sur batterie",
    batteryResolution: (levels: number) =>
      `Le casque rapporte ${levels} niveaux plutôt qu'un pourcentage : cette valeur avance donc par paliers. C'est ce que l'appareil a envoyé, pas une estimation.`,
    batteryOff:
      "Le casque est éteint : il ne rapporte donc aucun niveau de batterie.",
    batteryUnsupported: "Cet appareil ne rapporte pas de niveau de batterie.",

    mixLegend: "Mixage",
    chatmixTitle: "ChatMix",
    game: "Jeu",
    chat: "Discussion",
    chatmixExplain:
      "La molette est sur le casque lui-même. On voit seulement où elle est réglée ; elle ne peut pas être déplacée d'ici.",
    chatmixOff:
      "Le casque est éteint : la position de la molette n'est donc pas rapportée.",
    chatmixUnsupported: "Cet appareil n'a pas de molette ChatMix.",

    statusLegend: "État",
    liveTitle: "Relevés en direct",
    liveDescription: "Valeurs telles que reçues de l'appareil.",
    power: "Alimentation",
    on: "Allumé",
    off: "Éteint",
    autoShutOff: "Extinction automatique",
    equaliser: "Égaliseur",
    minutes: (count: number) => `${count} min`,
    custom: "Personnalisé",
    notReadBack: "Non relisible",
    notSupported: "Non pris en charge",
    notReadBackExplain:
      "« Non relisible » signifie que le casque accepte le réglage mais n'offre aucun moyen d'en demander la valeur actuelle. Ce qui est affiché ici, c'est ce qui lui a été dit ; après une reconnexion, rien n'est affiché plutôt que de deviner.",
  },

  audio: {
    noDeviceTitle: "Aucun appareil connecté",
    noDeviceBody: "Connectez un casque pour régler son volume.",
    noControlTitle: "Pas de réglage de volume sur cet appareil",
    cardUnreadable: "La carte son de l'appareil n'a pas pu être lue.",
    noHardwareVolume:
      "Ce casque n'expose pas de réglage de volume matériel.",

    outputLegend: "Sortie",
    volumeTitle: "Volume",
    volumeDescription:
      "Le volume propre au casque, la même commande que la molette sur l'écouteur.",
    muted: "Coupé",
    mute: "Couper",
    gain: "Gain",
    outputLevel: "Niveau de sortie",
    levelDetail: (steps: number) =>
      `${steps} crans matériels. Le modifier change le casque pour toutes les applications, pas seulement celle-ci.`,
    mutedTitle: "La sortie est coupée",
    mutedBody:
      "Le réglage de niveau est désactivé tant que le casque est coupé.",

    notAvailableLegend: "Indisponible",
    notAvailableTitle: "Ce que cet appareil ne fait pas",
    absent: [
      {
        name: "Limiteur de volume",
        detail: "Le matériel n'a pas de plafond de niveau.",
      },
      { name: "Audio spatial", detail: "Pas une fonction de ce casque." },
      {
        name: "Égaliseur logiciel",
        detail:
          "L'égaliseur est appliqué par le casque lui-même — voir la page Égaliseur.",
      },
    ],
  },

  microphone: {
    noDeviceTitle: "Aucun appareil connecté",
    noDeviceBody: "Connectez un casque pour régler son microphone.",

    inputLegend: "Entrée",
    title: "Microphone",
    description: "Le gain de capture dans le matériel audio du casque.",
    muted: "Coupé",
    mute: "Couper",
    gain: "Gain",
    captureLevel: "Niveau de capture",
    levelDetail: (steps: number) => `${steps} crans matériels.`,
    mutedTitle: "Le microphone est coupé",
    mutedBody:
      "Rien n'est capté. Il s'agit de la coupure matérielle : elle s'applique donc à toutes les applications.",
    noControl: "Cet appareil n'expose aucun réglage de microphone.",

    monitoringLegend: "Retour",
    sidetoneTitle: "Sidetone",
    sidetoneDescription:
      "La quantité de votre propre voix que le casque vous renvoie.",
    level: "Niveau",
    sidetoneSteps: (count: number) =>
      `Le casque mémorise ${count} positions : c'est donc un sélecteur et non un curseur.`,
    sidetoneUnknown:
      " Il ne dit pas laquelle est réglée — la sélection apparaît ici une fois que vous en choisissez une.",
    sidetoneUnsupported: "Cet appareil n'a pas de réglage de sidetone.",

    processingLegend: "Indisponible",
    processingTitle: "Traitement du microphone",
    processingBody:
      "Ce casque n'applique aucun traitement au signal du microphone. Rien de ce qui suit n'existe dans son matériel, et cette application ne l'appliquera pas en logiciel pour l'appeler ensuite une fonction de l'appareil :",
    processingList: [
      "Réduction de bruit",
      "Porte de bruit",
      "Compresseur",
      "Limiteur",
      "Amélioration de la voix",
      "Voyant de micro coupé",
    ],
  },

  equaliser: {
    unavailableTitle: "Aucun égaliseur disponible",
    noEqualiser: "Cet appareil n'a pas d'égaliseur.",
    connectFirst: "Connectez un casque pour régler son égaliseur.",

    toneLegend: "Timbre",
    title: "Égaliseur",
    hardwareDescription:
      "Appliqué par le casque lui-même — il reste actif pour toutes les applications, et partout ailleurs où ce casque est branché.",
    softwareDescription: "Appliqué par cette application.",
    flat: "Plat",
    presets: "Préréglages",
    custom: "Personnalisé",
    bandLabel: (frequency: string) => `bande ${frequency}`,
    bandValue: (decibels: string, frequency: string) =>
      `${decibels} décibels à ${frequency}`,
    range: (bands: number, min: number, max: number, step: number) =>
      `${bands} bandes · de ${min} à +${max} dB · pas de ${step} dB`,
    frequenciesAreLabels:
      "Les fréquences des bandes sont des étiquettes : le casque accepte dix gains par position et ne les nomme jamais ; celles-ci suivent donc la répartition habituelle à dix bandes.",
    noReadBackTitle: "Le casque ne rapporte pas sa courbe",
    noReadBackBody:
      "Il n'existe aucune commande pour demander à cet appareil comment son égaliseur est réglé. Après une reconnexion, les curseurs repartent à plat et montrent ce que cette application a envoyé depuis — pas nécessairement ce que le casque applique. Choisir un préréglage ou déplacer un curseur met les deux d'accord.",
  },

  profiles: {
    savedLegend: "Enregistrés",
    title: "Profils",
    description:
      "Des réglages conservés par cette application et envoyés au casque à la demande.",
    saveAs: "Enregistrer les réglages actuels sous",
    placeholder: "Tard le soir, Appel, Jeux…",
    save: "Enregistrer",
    noDeviceTitle: "Aucun appareil connecté",
    noDeviceBody:
      "Les profils ne peuvent être appliqués et modifiés que si un casque est connecté : sans cela, il n'y a rien d'où lire les réglages actuels.",
    failedTitle: "Cela n'a pas fonctionné",
    empty:
      "Pas encore de profil. Réglez le casque comme vous le souhaitez, puis enregistrez-le ici.",
    lastApplied: "appliqué en dernier",
    nothingStored: "Rien d'enregistré",
    apply: "Appliquer",
    rename: (name: string) => `Renommer ${name}`,
    remove: (name: string) => `Supprimer ${name}`,
    confirmRename: "Confirmer le nouveau nom",
    cancelRename: "Annuler le changement de nom",

    resultLegend: "Résultat",
    resultTitle: (name: string) => `« ${name} » appliqué`,
    sent: (settings: string) => `Envoyé au casque : ${settings}.`,
    nothingSent:
      "Ce profil ne contient aucun réglage : rien n'a donc été envoyé.",

    howLegend: "Comment cela fonctionne",
    howTitle: "Les profils vivent ici, pas dans le casque",
    howBody1:
      "Ce casque n'a pas de mémoire interne pour les réglages : il n'y a donc pas de bouton « enregistrer sur l'appareil » ici, car son protocole ne comporte pas cette commande. Appliquer un profil envoie chaque réglage à l'appareil un par un, exactement comme si vous les aviez faits à la main.",
    howBody2:
      "Cela veut aussi dire que le casque peut être modifié depuis ses propres commandes sans que cette application le sache. Un profil marqué comme appliqué en dernier est la trace de ce qui a été envoyé, pas une affirmation sur ce que le matériel fait actuellement.",

    contents: {
      volume: "Volume",
      muted: "Coupé",
      unmuted: "Son rétabli",
      micLevel: "Niveau du micro",
      micMuted: "Micro coupé",
      micLive: "Micro actif",
      sidetone: "Sidetone",
      autoShutOff: "Extinction automatique",
      equaliserCurve: "Courbe d'égaliseur",
      equaliserPreset: "Préréglage d'égaliseur",
    },
  },

  chatmix: {
    splitTitle: "Séparer le son du jeu et de la discussion",
    splitDetail:
      "Ajoute deux sorties — Headset — Game et Headset — Chat — et mélange les deux dans le casque. La molette règle alors l'équilibre entre elles, ce à quoi elle sert.",
    splitDisabledReason: "Connectez d'abord le casque.",
    activeTitle: "Les sorties jeu et discussion sont en place",
    activeBody:
      "Affectez chaque application à Headset — Game ou Headset — Chat dans votre contrôle de volume habituel. Tourner la molette déplace l'équilibre entre elles.",
    failedTitle: "Les sorties n'ont pas pu être créées",
    note: "Cela modifie les périphériques audio de toute votre session, pas seulement ceux de cette application. Le désactiver les retire, quitter aussi.",
  },

  device: {
    hardwareLegend: "Matériel",
    identityTitle: "Identité",
    simulatedDescription:
      "Un appareil simulé — ces valeurs sont fixes, elles ne sont pas lues sur du matériel.",
    realDescription: "Lu sur l'appareil connecté.",
    scanning: "Recherche",
    rescan: "Rechercher à nouveau",
    product: "Produit",
    vendorId: "Identifiant fabricant",
    productId: "Identifiant produit",
    connection: "Connexion",
    serial: "Numéro de série",
    firmware: "Version du micrologiciel",
    revision: "Révision matérielle",
    source: "Source",
    simulated: "Simulé",
    physical: "Appareil physique",
    notAvailable: "N.D.",
    nothingToReport:
      "Aucun appareil n'est connecté : il n'y a donc rien à indiquer.",
    naExplain:
      "Les champs marqués N.D. ne sont pas exposés par ce casque sur son interface de contrôle. Ils restent vides plutôt que d'être remplis depuis une base de données produits.",

    unverifiedTitle: "Cette version n'a pas été vérifiée sur votre casque",
    unverifiedBody:
      "La prise en charge de ce modèle a été écrite à partir de documents publiés sur lesquels deux projets indépendants s'accordent, mais personne ne l'a essayée sur le matériel. Elle lit donc votre casque et ne lui écrit pas : une commande que personne n'a vue recevoir de réponse ne s'envoie pas à l'aveugle.",
    unverifiedHelp:
      "Si vous avez ce casque et que les relevés ci-dessus correspondent à ce qu'il indique ailleurs, dites-le dans un ticket et les commandes pourront être activées.",
    detectedLegend: "Détectés",
    detectedTitle: "Appareils sur ce système",
    detectedDescription:
      "Tous les appareils pris en charge trouvés, y compris ceux qui ne peuvent pas être ouverts pour le moment.",
    scanningEllipsis: "Recherche…",
    nothingFound: "Rien trouvé.",
    available: "Disponible",
    connect: "Connecter",
    connected: "Connecté",

    powerLegend: "Alimentation",
    autoShutOffTitle: "Extinction automatique",
    autoShutOffDescription:
      "Le temps que le casque attend, sans audio ni mouvement, avant de s'éteindre pour économiser la batterie.",
    idleTimeout: "Délai d'inactivité",
    never: "Jamais",
    minutes: (count: number) => `${count} min`,
    autoShutOffDetail: (max: number) =>
      `Le casque accepte de 0 à ${max} minutes. Zéro désactive complètement la minuterie.`,
    autoShutOffUnknown:
      "Le casque ne rapporte pas son délai actuel : après une reconnexion, il repart de zéro et montre ce que cette application a envoyé depuis.",

    capabilitiesLegend: "Capacités",
    capabilitiesTitle: "Ce que cet appareil sait faire",
    capabilitiesDescription:
      "Rapporté par le matériel, pas déduit du nom du modèle.",
    supported: "pris en charge",
    unsupported: "non pris en charge",
  },

  settings: {
    settingFailed: "Ce réglage n'a pas été appliqué",

    startupLegend: "Démarrage",
    startupTitle: "Lancement",
    startWithSystem: "Démarrer avec le système",
    startWithSystemDetail:
      "Ajoute une entrée de démarrage automatique dans votre dossier utilisateur. Rien n'est installé pour tout le système.",
    startMinimised: "Démarrer dans la zone de notification",
    startMinimisedDetail: "Démarrer sans ouvrir la fenêtre.",
    startMinimisedDisabled:
      "Disponible dès que l'application démarre avec le système.",
    closeToTray: "Fermer la fenêtre laisse l'application en marche",
    closeToTrayDetail:
      "Le casque continue d'être lu et l'entrée dans la zone de notification reste disponible. Pour tout arrêter, quittez depuis son menu.",

    languageLegend: "Langue",
    languageTitle: "Langue de l'interface",
    languageDescription:
      "S'applique immédiatement, y compris au menu de la zone de notification et aux notifications.",
    systemLanguage: "Suivre le système",
    languageNote:
      "Les relevés de l'appareil ne sont jamais traduits : un décibel est un décibel, et le nom d'un modèle est celui que le matériel se donne.",

    alertsLegend: "Alertes",
    alertsTitle: "Notifications",
    lowBattery: "Avertir quand la batterie est faible",
    lowBatteryDetail:
      "Affiché une fois au passage sous le seuil, pas de façon répétée.",
    threshold: "Seuil",
    thresholdNote:
      "Seuls ces deux seuils sont proposés parce que le casque rapporte cinq niveaux : 0, 25, 50, 75 et 100 pour cent. Un seuil à 30 % attendrait un nombre que l'appareil n'envoie jamais.",

    developmentLegend: "Développement",
    simulatedTitle: "Appareil simulé",
    simulatedDescription:
      "Pour travailler sur l'interface sans matériel branché.",
    useSimulated: "Utiliser un appareil simulé",
    useSimulatedDetail:
      "Remplace le casque par un substitut qui rapporte les mêmes capacités et la même résolution. Chaque relevé est clairement indiqué comme simulé.",
    simulationOnTitle: "La simulation est active",
    simulationOnBody:
      "Tant qu'elle est active, aucun casque physique n'est lu ni écrit.",

    supportLegend: "Assistance",
    diagnosticsTitle: "Diagnostic",
    diagnosticsDescription:
      "Un rapport en texte de ce que cette application voit, à joindre à un signalement de bogue.",
    writeReport: "Écrire le rapport",
    writtenTo: "Écrit dans",
    diagnosticsBody:
      "Contient les identifiants de l'appareil, ses capacités, les derniers relevés et vos réglages. Rien sur vous, et rien n'est envoyé où que ce soit : le fichier reste sur cette machine.",

    aboutLegend: "Application",
    aboutTitle: "À propos",
    aboutBody1:
      "Une application locale pour piloter les casques pris en charge directement en USB. Rien n'est envoyé nulle part : pas de compte, pas de télémétrie, pas de connexion réseau.",
    aboutBody2:
      "La prise en charge repose sur des protocoles publiquement documentés. Lorsqu'une commande n'a pas été vérifiée sur du matériel, la fonction est marquée non prise en charge plutôt que livrée au jugé.",
    version: (version: string) => `Version ${version} · Linux`,
    versionUnavailable: "Version inconnue · Linux",
    loading: "Chargement…",
  },

  capabilities: {
    batteryLevel: "Niveau de batterie",
    batteryLevelDetail: (steps: number, apart: number) =>
      `${steps} niveaux distincts, espacés de ${apart} %`,
    batteryLevelAbsent: "Non rapporté par cet appareil",
    chargingState: "État de charge",
    chargingStateDetail: "Rapporté tant que le câble est branché",
    chatmix: "Molette ChatMix",
    chatmixDetail: "Lecture seule — la molette est sur le casque",
    chatmixAbsent: "Absente de cet appareil",
    sidetone: "Sidetone",
    sidetoneDetail: (count: number, labels: string) =>
      `${count} crans matériels : ${labels}`,
    sidetoneAbsent: "Non réglable sur cet appareil",
    equaliser: "Égaliseur",
    equaliserDetail: (bands: number, min: number, max: number, step: number) =>
      `${bands} bandes, de ${min} à +${max} dB par pas de ${step} dB`,
    equaliserHardware: " — appliqué par le casque lui-même",
    equaliserAbsent: "Indisponible sur cet appareil",
    presets: "Préréglages d'égaliseur",
    presetsAbsent: "Aucun préréglage enregistré",
    inactiveTime: "Minuterie d'extinction",
    inactiveTimeDetail: (max: number) => `Jusqu'à ${max} minutes`,
    inactiveTimeAbsent: "Non réglable sur cet appareil",
    volume: "Volume de sortie",
    volumeDetail: "Volume du matériel audio USB",
    mute: "Coupure de la sortie",
    muteDetail: "Coupure du matériel audio USB",
    notExposed: "Non exposé par cet appareil",
    micVolume: "Volume du microphone",
    micVolumeDetail: "Gain de capture audio USB",
    micMute: "Coupure du microphone",
    micMuteDetail: "Coupure de la capture audio USB",
    softwareProfiles: "Profils logiciels",
    softwareProfilesDetail:
      "Conservés par cette application et envoyés au casque à la demande",
    onboardProfiles: "Mémoire de profils dans l'appareil",
    onboardProfilesDetail: "Les réglages persistent dans le casque",
    onboardProfilesAbsent:
      "Le casque ne peut pas stocker de profils : il n'y a donc rien à y enregistrer",
    firmware: "Mise à jour du micrologiciel",
    firmwareAbsent:
      "Aucune procédure de mise à jour documentée pour cet appareil",
    dpi: "Résolution du capteur",
    dpiDetail: (count: number, min: number, max: number) =>
      `${count} paliers, ${min}-${max} CPI`,
    dpiAbsent: "Ce périphérique n'a pas de capteur",
    pollingRate: "Fréquence d'interrogation",
    pollingRateDetail: (rates: string) => `${rates}`,
    pollingRateAbsent: "Non réglable sur ce périphérique",
    lightingZones: "Zones d'éclairage",
    lightingZonesDetail: (zones: string) => zones,
    lightingZonesAbsent: "Aucune zone adressable",
    onboardMemory: "Mémoire interne",
    onboardMemoryDetail: "Les réglages peuvent être écrits dans le périphérique",
    onboardMemoryAbsent: "Le périphérique ne conserve rien de lui-même",
    rgb: "Éclairage RVB",
    rgbAbsent: "Ce casque n'a pas d'éclairage adressable",
    spatial: "Audio spatial",
    spatialAbsent: "Pas une fonction matérielle ici",
    noiseReduction: "Réduction de bruit matérielle",
    noiseReductionAbsent:
      "Aucune porte de bruit, aucun compresseur ni limiteur dans l'appareil",
    supported: "Pris en charge",
    notAvailable: "Indisponible",
  },

  devices: {
    title: "Périphériques",
    readOnly: "Lecture seule",
    off: "Éteint",
    noReading: "Aucune mesure",
  },

  sensor: {
    title: "Capteur",
    lede: "Les résolutions que cette souris fait défiler, et la fréquence à laquelle elle se signale.",
    presets: "Paliers de résolution",
    presetsHint: (max: number) =>
      `Jusqu'à ${max}. Le bouton sous la souris les parcourt dans l'ordre.`,
    preset: (n: number) => `Palier ${n}`,
    selected: "Sélectionné",
    select: "Sélectionner ce palier",
    add: "Ajouter un palier",
    remove: "Retirer",
    cpi: "CPI",
    snapped: (cpi: number) => `Valeur la plus proche du capteur : ${cpi} CPI`,
    reportRate: "Fréquence d'interrogation",
    reportRateHint:
      "À quelle fréquence la souris signale sa position. Plus haut consomme la batterie.",
    hz: (n: number) => `${n} Hz`,
    sleepTimer: "Mise en veille",
    sleepTimerHint: (max: number) =>
      `Minutes d'inactivité avant que la souris ne s'éteigne. Jusqu'à ${max}.`,
    never: "Jamais",
    minutes: (n: number) => `${n} min`,
    save: "Enregistrer dans la souris",
    saveHint:
      "Ces valeurs sont renvoyées à chaque réveil de la souris. Les enregistrer les écrit en plus dans la mémoire de la souris, où elles subsistent sans cette application.",
    saved: "Enregistré dans le périphérique",
    absent: "Le périphérique sélectionné n'a pas de capteur à régler.",
  },

  lighting: {
    title: "Éclairage",
    lede: "Trois LED le long de la coque de la souris.",
    effect: "Effet",
    effectHint:
      "Poser une couleur est ce qui arrête l'arc-en-ciel : le périphérique n'a pas de commande distincte pour cela.",
    zones: "Couleurs par zone",
    reactive: "Éclair au clic",
    reactiveHint: "Une couleur montrée brièvement à chaque appui.",
    reactiveOff: "Désactivé",
    dim: "Atténuer après",
    dimHint: "Secondes d'inactivité avant que l'éclairage ne baisse. Zéro n'atténue jamais.",
    seconds: (n: number) => `${n} s`,
    absent: "Le périphérique sélectionné n'a pas d'éclairage adressable.",
  },
  terms: {
    top: "Haut",
    middle: "Milieu",
    bottom: "Bas",
    static: "Fixe",
    rainbow: "Arc-en-ciel",
    off: "Désactivé",
    low: "Faible",
    medium: "Moyen",
    high: "Élevé",
    flat: "Plat",
    bassboost: "Graves renforcés",
    smiley: "Sourire",
    focus: "Focus",
  },

  errors: {
    unverified:
      "Cette version n'a pas été vérifiée sur votre casque : elle se contente de le lire.",
    unsupported: "Votre appareil ne prend pas en charge cette fonction.",
    busy: "Une autre application pilote l'appareil en ce moment.",
    offline: "Le casque est éteint.",
    notConnected: "Aucun appareil n'est connecté.",
    transport: "Impossible de communiquer avec l'appareil.",
    protocol: "L'appareil a envoyé une réponse inattendue.",
    invalidParameter: "Cette valeur est en dehors de ce que l'appareil accepte.",
    failed: (action: string) => `${action} : échec.`,
  },

  actions: {
    settingResolution: "Réglage de la résolution",
    settingReportRate: "Réglage de la fréquence",
    settingLighting: "Réglage de l'éclairage",
    savingToDevice: "Enregistrement dans le périphérique",
    switchingDevice: "Changement de périphérique",
    settingVolume: "Réglage du volume",
    changingMute: "Changement de la coupure",
    settingMicLevel: "Réglage du niveau du microphone",
    changingMicMute: "Changement de la coupure du microphone",
    settingSidetone: "Réglage du sidetone",
    settingEqualiser: "Réglage de l'égaliseur",
    applyingPreset: "Application d'un préréglage d'égaliseur",
    settingAutoShutOff: "Réglage de l'extinction automatique",
    readingState: "Lecture de l'état de l'appareil",
    scanning: "Recherche d'appareils",
    connecting: "Connexion",
  },

  tray: {
    noDevice: "Aucun appareil détecté",
    batteryUnknown: "Batterie : —",
    batteryNotReported: "Batterie : non rapportée",
    battery: "Batterie : {percent} %",
    batteryCharging: "Batterie : {percent} % · en charge",
    muteOutput: "Couper la sortie",
    unmuteOutput: "Rétablir la sortie",
    muteMicrophone: "Couper le microphone",
    unmuteMicrophone: "Rétablir le microphone",
    open: "Ouvrir Gear Control Center",
    quit: "Quitter",
    lowBatteryTitle: "Batterie faible sur {device}",
    lowBatteryBody: "Il reste {percent} %.",
  },
};
