import type { Catalog } from "./en";

/**
 * Spanish.
 *
 * Las medidas y todo lo que informa el propio dispositivo no se traducen: un
 * decibelio es un decibelio y el nombre del modelo es como se llama a sí mismo
 * el hardware. Se traduce lo que dice la aplicación.
 */
export const es: Catalog = {
  meta: { name: "Español" },

  app: {
    name: "Headset Control Center",
    tagline: "Local · Abierto",
    sections: "Secciones",
    connection: "Conexión",
    noDeviceDetected: "No se detectó ningún dispositivo",
    lookingForDevices: "Buscando dispositivos",
    commandFailed: "El comando al dispositivo falló",
    dismiss: "Cerrar",
  },

  nav: {
    dashboard: "Panel",
    audio: "Audio",
    microphone: "Micrófono",
    equaliser: "Ecualizador",
    profiles: "Perfiles",
    device: "Dispositivo",
    settings: "Ajustes",
  },

  connection: {
    connected: "Conectado",
    disconnected: "Desconectado",
    connecting: "Conectando",
    reconnecting: "Reconectando",
    unknown: "Desconocido",
    error: "Error",
  },

  strip: {
    device: "Dispositivo",
    link: "Enlace",
    battery: "Batería",
    chatmix: "ChatMix",
    noDevice: "Sin dispositivo",
    poweredOn: "Auriculares encendidos",
    poweredOff: "Auriculares apagados",
    charging: "Cargando",
    reportedLevels: (count: number) => `${count} niveles informados`,
    notSupported: "No compatible",
    notReportedWhileOff: "No se informa mientras están apagados",
  },

  empty: {
    title: "No se detectó ningún dispositivo compatible",
    lede: "Ahora mismo no hay nada conectado con lo que esta aplicación sepa hablar.",
    hints: [
      "Compruebe que el receptor inalámbrico esté conectado.",
      "Encienda los auriculares y espere unos segundos a que se emparejen.",
      "Cierre cualquier otro software que controle los auriculares: solo una aplicación puede retener el dispositivo a la vez.",
    ],
    scanning: "Buscando",
    scanAgain: "Buscar de nuevo",
    useSimulated: "Usar un dispositivo simulado",
  },

  conflict: {
    title: (name: string) => `${name} está conectado pero no se puede abrir`,
    useSimulatedInstead: "Trabajar con un dispositivo simulado",
    explain:
      "Otra aplicación está reteniendo la interfaz de control. En este sistema suele ser un servicio en segundo plano; detenerlo libera los auriculares:",
    nothingChanged:
      "No se ha cambiado nada en su sistema: ejecute usted mismo ese comando si quiere que esta aplicación tome el control, y vuelva a activarlo después con:",
  },

  dashboard: {
    hostErrorTitle: "Sin acceso al hardware",
    simulatedTitle: "Dispositivo simulado",
    simulatedBody:
      "Estas lecturas las genera la aplicación, no unos auriculares. Desactívelo en Ajustes cuando conecte hardware real.",

    controlsLegend: "Controles",
    controlsTitle: "Controles rápidos",
    outputVolume: "Volumen de salida",
    hardwareSteps: (count: number) => `${count} pasos de hardware`,
    mute: "Silenciar",
    unmute: "Activar sonido",
    muteMic: "Silenciar micro",
    unmuteMic: "Activar micro",
    sidetone: "Sidetone",

    powerLegend: "Energía",
    batteryTitle: "Batería",
    chargingOverUsb: "Cargando por USB",
    lowChargeSoon: "Baja: cargue pronto",
    runningOnBattery: "Funcionando con batería",
    batteryResolution: (levels: number) =>
      `Los auriculares informan ${levels} niveles en lugar de un porcentaje, por eso esta cifra avanza a saltos. Es lo que envió el dispositivo, no una estimación.`,
    batteryOff:
      "Los auriculares están apagados, así que no informan del nivel de batería.",
    batteryUnsupported: "Este dispositivo no informa del nivel de batería.",

    mixLegend: "Mezcla",
    chatmixTitle: "ChatMix",
    game: "Juego",
    chat: "Chat",
    chatmixExplain:
      "La rueda está en los propios auriculares. Aquí solo se ve en qué posición está; no se puede mover desde aquí.",
    chatmixOff:
      "Los auriculares están apagados, así que no se informa de la posición de la rueda.",
    chatmixUnsupported: "Este dispositivo no tiene rueda ChatMix.",

    statusLegend: "Estado",
    liveTitle: "Lecturas en vivo",
    liveDescription: "Valores tal como se recibieron del dispositivo.",
    power: "Encendido",
    on: "Sí",
    off: "No",
    autoShutOff: "Apagado automático",
    equaliser: "Ecualizador",
    minutes: (count: number) => `${count} min`,
    custom: "Personalizado",
    notReadBack: "No se puede leer",
    notSupported: "No compatible",
    notReadBackExplain:
      "“No se puede leer” significa que los auriculares aceptan el ajuste pero no ofrecen forma de consultar su valor actual. Aquí se muestra lo que se les indicó, y tras una reconexión no se muestra nada en lugar de adivinar.",
  },

  audio: {
    noDeviceTitle: "Ningún dispositivo conectado",
    noDeviceBody: "Conecte unos auriculares para controlar su volumen.",
    noControlTitle: "Este dispositivo no tiene control de volumen",
    cardUnreadable: "No se pudo leer la tarjeta de audio del dispositivo.",
    noHardwareVolume:
      "Estos auriculares no exponen un control de volumen por hardware.",

    outputLegend: "Salida",
    volumeTitle: "Volumen",
    volumeDescription:
      "El volumen propio de los auriculares, el mismo control que la rueda del casco.",
    muted: "Silenciado",
    mute: "Silenciar",
    gain: "Ganancia",
    outputLevel: "Nivel de salida",
    levelDetail: (steps: number) =>
      `${steps} pasos de hardware. Cambiarlo cambia los auriculares para todas las aplicaciones, no solo para esta.`,
    mutedTitle: "La salida está silenciada",
    mutedBody:
      "El control de nivel está desactivado mientras los auriculares están silenciados.",

    notAvailableLegend: "No disponible",
    notAvailableTitle: "Lo que este dispositivo no hace",
    absent: [
      {
        name: "Limitador de volumen",
        detail: "El hardware no tiene tope de nivel máximo.",
      },
      { name: "Audio espacial", detail: "No es una función de estos auriculares." },
      {
        name: "Ecualizador por software",
        detail:
          "El ecualizador lo aplican los propios auriculares: consulte la página Ecualizador.",
      },
    ],
  },

  microphone: {
    noDeviceTitle: "Ningún dispositivo conectado",
    noDeviceBody: "Conecte unos auriculares para controlar su micrófono.",

    inputLegend: "Entrada",
    title: "Micrófono",
    description: "La ganancia de captura en el propio hardware de audio.",
    muted: "Silenciado",
    mute: "Silenciar",
    gain: "Ganancia",
    captureLevel: "Nivel de captura",
    levelDetail: (steps: number) => `${steps} pasos de hardware.`,
    mutedTitle: "El micrófono está silenciado",
    mutedBody:
      "No se está capturando nada. Es el silencio por hardware, así que afecta a todas las aplicaciones.",
    noControl: "Este dispositivo no expone control de micrófono.",

    monitoringLegend: "Monitorización",
    sidetoneTitle: "Sidetone",
    sidetoneDescription:
      "Cuánto de su propia voz le devuelven los auriculares.",
    level: "Nivel",
    sidetoneSteps: (count: number) =>
      `Los auriculares guardan ${count} posiciones, así que esto es un selector y no un deslizador.`,
    sidetoneUnknown:
      " No informan de cuál está puesta: la selección aparece aquí en cuanto usted elige una.",
    sidetoneUnsupported: "Este dispositivo no tiene control de sidetone.",

    processingLegend: "No disponible",
    processingTitle: "Procesado del micrófono",
    processingBody:
      "Estos auriculares no procesan la señal del micrófono. Nada de lo siguiente existe en su hardware, y esta aplicación no lo aplicará por software para luego llamarlo función del dispositivo:",
    processingList: [
      "Reducción de ruido",
      "Puerta de ruido",
      "Compresor",
      "Limitador",
      "Mejora de voz",
      "LED de micrófono silenciado",
    ],
  },

  equaliser: {
    unavailableTitle: "No hay ecualizador disponible",
    noEqualiser: "Este dispositivo no tiene ecualizador.",
    connectFirst: "Conecte unos auriculares para ajustar su ecualizador.",

    toneLegend: "Tono",
    title: "Ecualizador",
    hardwareDescription:
      "Lo aplican los propios auriculares: sigue activo para todas las aplicaciones y en cualquier otro sitio donde se conecten.",
    softwareDescription: "Lo aplica esta aplicación.",
    flat: "Plano",
    presets: "Preajustes",
    custom: "Personalizado",
    bandLabel: (frequency: string) => `banda de ${frequency}`,
    bandValue: (decibels: string, frequency: string) =>
      `${decibels} decibelios en ${frequency}`,
    range: (bands: number, min: number, max: number, step: number) =>
      `${bands} bandas · de ${min} a +${max} dB · pasos de ${step} dB`,
    frequenciesAreLabels:
      "Las frecuencias de banda son etiquetas: los auriculares aceptan diez ganancias por posición y nunca las nombran, así que estas siguen el reparto habitual de diez bandas.",
    noReadBackTitle: "Los auriculares no informan de su curva",
    noReadBackBody:
      "No existe un comando para preguntar a este dispositivo cómo tiene puesto el ecualizador. Tras una reconexión los deslizadores empiezan planos y muestran lo que esta aplicación ha enviado desde entonces, no necesariamente lo que los auriculares aplican. Elegir un preajuste o mover un deslizador hace que ambos coincidan.",
  },

  profiles: {
    savedLegend: "Guardados",
    title: "Perfiles",
    description:
      "Ajustes que guarda esta aplicación y envía a los auriculares cuando se le pide.",
    saveAs: "Guardar los ajustes actuales como",
    placeholder: "De noche, Llamada, Juegos…",
    save: "Guardar",
    noDeviceTitle: "Ningún dispositivo conectado",
    noDeviceBody:
      "Los perfiles solo se pueden aplicar y editar con unos auriculares conectados: no hay de dónde leer los ajustes actuales.",
    failedTitle: "Eso no ha funcionado",
    empty:
      "Aún no hay perfiles. Deje los auriculares como los quiere y guárdelos aquí.",
    lastApplied: "aplicado por última vez",
    nothingStored: "No guarda nada",
    apply: "Aplicar",
    rename: (name: string) => `Renombrar ${name}`,
    remove: (name: string) => `Eliminar ${name}`,
    confirmRename: "Confirmar el nuevo nombre",
    cancelRename: "Cancelar el cambio de nombre",

    resultLegend: "Resultado",
    resultTitle: (name: string) => `Se aplicó “${name}”`,
    sent: (settings: string) => `Enviado a los auriculares: ${settings}.`,
    nothingSent: "Este perfil no guarda ningún ajuste, así que no se envió nada.",

    howLegend: "Cómo funciona",
    howTitle: "Los perfiles viven aquí, no en los auriculares",
    howBody1:
      "Estos auriculares no tienen memoria interna para ajustes, así que aquí no hay botón de “guardar en el dispositivo”: su protocolo no tiene ese comando. Aplicar un perfil envía cada ajuste al dispositivo uno a uno, igual que si los hubiera puesto a mano.",
    howBody2:
      "Eso también significa que los auriculares pueden cambiarse desde sus propios controles sin que esta aplicación se entere. Un perfil marcado como aplicado por última vez es un registro de lo que se envió, no una afirmación sobre lo que el hardware está haciendo ahora.",

    contents: {
      volume: "Volumen",
      muted: "Silenciado",
      unmuted: "Con sonido",
      micLevel: "Nivel de micrófono",
      micMuted: "Micrófono silenciado",
      micLive: "Micrófono activo",
      sidetone: "Sidetone",
      autoShutOff: "Apagado automático",
      equaliserCurve: "Curva del ecualizador",
      equaliserPreset: "Preajuste del ecualizador",
    },
  },

  chatmix: {
    splitTitle: "Separar el audio de juego y de chat",
    splitDetail:
      "Añade dos salidas — Headset — Game y Headset — Chat — y mezcla ambas en los auriculares. La rueda ajusta entonces el equilibrio entre ellas, que es para lo que está.",
    splitDisabledReason: "Conecte primero los auriculares.",
    activeTitle: "Las salidas de juego y chat están puestas",
    activeBody:
      "Asigne cada aplicación a Headset — Game o Headset — Chat en su control de volumen habitual. Girar la rueda cambia el equilibrio entre ellas.",
    failedTitle: "No se pudieron crear las salidas",
    note: "Esto cambia los dispositivos de audio de toda su sesión, no solo los de esta aplicación. Desactivarlo los retira, y salir también.",
  },

  device: {
    hardwareLegend: "Hardware",
    identityTitle: "Identidad",
    simulatedDescription:
      "Un dispositivo simulado: estos valores son fijos, no se leen del hardware.",
    realDescription: "Leído del dispositivo conectado.",
    scanning: "Buscando",
    rescan: "Volver a buscar",
    product: "Producto",
    vendorId: "ID de fabricante",
    productId: "ID de producto",
    connection: "Conexión",
    serial: "Número de serie",
    firmware: "Versión de firmware",
    revision: "Revisión de hardware",
    source: "Origen",
    simulated: "Simulado",
    physical: "Dispositivo físico",
    notAvailable: "N/D",
    nothingToReport:
      "No hay ningún dispositivo conectado, así que no hay nada que informar.",
    naExplain:
      "Los campos marcados como N/D no los expone este dispositivo por su interfaz de control. Se dejan vacíos en lugar de rellenarse desde una base de datos de productos.",

    detectedLegend: "Detectados",
    detectedTitle: "Dispositivos en este sistema",
    detectedDescription:
      "Todos los dispositivos compatibles encontrados, incluidos los que ahora no se pueden abrir.",
    scanningEllipsis: "Buscando…",
    nothingFound: "No se encontró nada.",
    available: "Disponible",
    connect: "Conectar",
    connected: "Conectado",

    powerLegend: "Energía",
    autoShutOffTitle: "Apagado automático",
    autoShutOffDescription:
      "Cuánto esperan los auriculares, sin audio y sin movimiento, antes de apagarse para ahorrar batería.",
    idleTimeout: "Tiempo de inactividad",
    never: "Nunca",
    minutes: (count: number) => `${count} min`,
    autoShutOffDetail: (max: number) =>
      `Los auriculares aceptan de 0 a ${max} minutos. Cero desactiva el temporizador por completo.`,
    autoShutOffUnknown:
      "Los auriculares no informan de su tiempo actual, así que tras una reconexión empieza en cero y muestra lo que esta aplicación ha enviado desde entonces.",

    capabilitiesLegend: "Capacidades",
    capabilitiesTitle: "Lo que puede hacer este dispositivo",
    capabilitiesDescription:
      "Informado por el hardware, no supuesto a partir del nombre del modelo.",
    supported: "compatible",
    unsupported: "no compatible",
  },

  settings: {
    settingFailed: "Ese ajuste no se aplicó",

    startupLegend: "Inicio",
    startupTitle: "Arranque",
    startWithSystem: "Iniciar con el sistema",
    startWithSystemDetail:
      "Añade una entrada de arranque automático en su carpeta de usuario. No se instala nada en todo el sistema.",
    startMinimised: "Iniciar en la bandeja",
    startMinimisedDetail: "Arrancar sin abrir la ventana.",
    startMinimisedDisabled:
      "Disponible cuando la aplicación se inicie con el sistema.",
    closeToTray: "Cerrar la ventana la mantiene en marcha",
    closeToTrayDetail:
      "Los auriculares se siguen leyendo y la entrada en la bandeja sigue disponible. Para detenerla del todo, salga desde el menú de la bandeja.",

    languageLegend: "Idioma",
    languageTitle: "Idioma de la interfaz",
    languageDescription:
      "Se aplica de inmediato, también al menú de la bandeja y a las notificaciones.",
    systemLanguage: "Seguir al sistema",
    languageNote:
      "Las lecturas del dispositivo nunca se traducen: un decibelio es un decibelio y el nombre del modelo es como se llama a sí mismo el hardware.",

    alertsLegend: "Avisos",
    alertsTitle: "Notificaciones",
    lowBattery: "Avisar cuando quede poca batería",
    lowBatteryDetail:
      "Se muestra una vez al bajar del umbral, no repetidamente.",
    threshold: "Umbral",
    thresholdNote:
      "Solo se ofrecen estos dos porque los auriculares informan cinco niveles: 0, 25, 50, 75 y 100 por ciento. Un umbral del 30 % estaría esperando una cifra que el dispositivo nunca envía.",

    developmentLegend: "Desarrollo",
    simulatedTitle: "Dispositivo simulado",
    simulatedDescription:
      "Para trabajar en la interfaz sin hardware conectado.",
    useSimulated: "Usar un dispositivo simulado",
    useSimulatedDetail:
      "Sustituye los auriculares por un sustituto que informa las mismas capacidades y la misma resolución. Cada lectura se marca claramente como simulada.",
    simulationOnTitle: "La simulación está activa",
    simulationOnBody:
      "Mientras esté activa no se lee ni se escribe en ningún auricular físico.",

    supportLegend: "Soporte",
    diagnosticsTitle: "Diagnóstico",
    diagnosticsDescription:
      "Un informe en texto de lo que ve esta aplicación, para adjuntar a un informe de error.",
    writeReport: "Escribir informe",
    writtenTo: "Escrito en",
    diagnosticsBody:
      "Contiene identificadores del dispositivo, capacidades, las últimas lecturas y sus ajustes. No contiene nada sobre usted y no se envía a ninguna parte: el archivo se queda en esta máquina.",

    aboutLegend: "Aplicación",
    aboutTitle: "Acerca de",
    aboutBody1:
      "Una aplicación local para controlar auriculares compatibles directamente por USB. No se envía nada a ninguna parte: no hay cuenta, ni telemetría, ni conexión de red.",
    aboutBody2:
      "La compatibilidad se basa en protocolos documentados públicamente. Cuando un comando no se ha verificado contra el hardware, la función se marca como no compatible en lugar de publicarse a ciegas.",
    version: (version: string) => `Versión ${version} · Linux`,
    versionUnavailable: "Versión desconocida · Linux",
    loading: "Cargando…",
  },

  capabilities: {
    batteryLevel: "Nivel de batería",
    batteryLevelDetail: (steps: number) =>
      `${steps} niveles discretos (0 / 25 / 50 / 75 / 100 %)`,
    batteryLevelAbsent: "Este dispositivo no lo informa",
    chargingState: "Estado de carga",
    chargingStateDetail: "Se informa mientras el cable está conectado",
    chatmix: "Rueda ChatMix",
    chatmixDetail: "Solo lectura: la rueda está en los auriculares",
    chatmixAbsent: "No está presente en este dispositivo",
    sidetone: "Sidetone",
    sidetoneDetail: (count: number, labels: string) =>
      `${count} pasos de hardware: ${labels}`,
    sidetoneAbsent: "No es ajustable en este dispositivo",
    equaliser: "Ecualizador",
    equaliserDetail: (bands: number, min: number, max: number, step: number) =>
      `${bands} bandas, de ${min} a +${max} dB en pasos de ${step} dB`,
    equaliserHardware: " — lo aplican los propios auriculares",
    equaliserAbsent: "No disponible en este dispositivo",
    presets: "Preajustes del ecualizador",
    presetsAbsent: "Sin preajustes guardados",
    inactiveTime: "Temporizador de apagado",
    inactiveTimeDetail: (max: number) => `Hasta ${max} minutos`,
    inactiveTimeAbsent: "No es ajustable en este dispositivo",
    volume: "Volumen de salida",
    volumeDetail: "Volumen del hardware de audio USB",
    mute: "Silencio de salida",
    muteDetail: "Silencio del hardware de audio USB",
    notExposed: "Este dispositivo no lo expone",
    micVolume: "Volumen del micrófono",
    micVolumeDetail: "Ganancia de captura de audio USB",
    micMute: "Silencio del micrófono",
    micMuteDetail: "Silencio de captura de audio USB",
    softwareProfiles: "Perfiles por software",
    softwareProfilesDetail:
      "Los guarda esta aplicación y los envía a los auriculares cuando se le pide",
    onboardProfiles: "Memoria de perfiles en el dispositivo",
    onboardProfilesDetail: "Los ajustes permanecen en los auriculares",
    onboardProfilesAbsent:
      "Los auriculares no pueden guardar perfiles, así que no hay nada que guardar en ellos",
    firmware: "Actualización de firmware",
    firmwareAbsent: "No hay una vía de actualización documentada para este dispositivo",
    rgb: "Iluminación RGB",
    rgbAbsent: "Estos auriculares no tienen iluminación direccionable",
    spatial: "Audio espacial",
    spatialAbsent: "Aquí no es una función del hardware",
    noiseReduction: "Reducción de ruido por hardware",
    noiseReductionAbsent:
      "El dispositivo no tiene puerta de ruido, compresor ni limitador",
    supported: "Compatible",
    notAvailable: "No disponible",
  },

  terms: {
    off: "Apagado",
    low: "Bajo",
    medium: "Medio",
    high: "Alto",
    flat: "Plano",
    bassboost: "Refuerzo de graves",
    smiley: "Sonrisa",
    focus: "Enfoque",
  },

  errors: {
    unsupported: "Su dispositivo no admite esta función.",
    busy: "Otra aplicación está controlando el dispositivo ahora mismo.",
    offline: "Los auriculares están apagados.",
    notConnected: "No hay ningún dispositivo conectado.",
    transport: "No se puede comunicar con el dispositivo.",
    protocol: "El dispositivo envió una respuesta inesperada.",
    invalidParameter: "Ese valor está fuera de lo que acepta el dispositivo.",
    failed: (action: string) => `${action}: falló.`,
  },

  actions: {
    settingVolume: "Ajustar el volumen",
    changingMute: "Cambiar el silencio",
    settingMicLevel: "Ajustar el nivel del micrófono",
    changingMicMute: "Cambiar el silencio del micrófono",
    settingSidetone: "Ajustar el sidetone",
    settingEqualiser: "Ajustar el ecualizador",
    applyingPreset: "Aplicar un preajuste del ecualizador",
    settingAutoShutOff: "Ajustar el apagado automático",
    readingState: "Leer el estado del dispositivo",
    scanning: "Buscar dispositivos",
    connecting: "Conectar",
  },

  tray: {
    noDevice: "No se detectó ningún dispositivo",
    batteryUnknown: "Batería: —",
    batteryNotReported: "Batería: no informada",
    battery: "Batería: {percent} %",
    batteryCharging: "Batería: {percent} % · cargando",
    muteOutput: "Silenciar la salida",
    unmuteOutput: "Activar la salida",
    muteMicrophone: "Silenciar el micrófono",
    unmuteMicrophone: "Activar el micrófono",
    open: "Abrir Headset Control Center",
    quit: "Salir",
    lowBatteryTitle: "Queda poca batería en {device}",
    lowBatteryBody: "Queda un {percent} %.",
  },
};
