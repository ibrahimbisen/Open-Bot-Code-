import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/computerUse";

export const messages = {
  "computerUse.permission.screenRecording.title": "Grabación de pantalla",
  "computerUse.permission.screenRecording.description":
    "Permite que OpenBot Code vea las ventanas de las aplicaciones.",
  "computerUse.permission.screenRecording.pane": "Grabación de pantalla y audio del sistema",
  "computerUse.permission.accessibility.title": "Accesibilidad",
  "computerUse.permission.accessibility.description": "Permite que OpenBot Code haga clic y escriba.",
  "computerUse.permission.accessibility.pane": "Accesibilidad",
  "computerUse.error.check": "OpenBot Code no pudo comprobar el uso del equipo.",
  "computerUse.error.openSettings": "OpenBot Code no pudo abrir los Ajustes del Sistema.",
  "computerUse.error.startDriver": "OpenBot Code no pudo iniciar el controlador de uso del equipo.",
  "computerUse.checkAgain": "Comprobar",
  "computerUse.checking": "Comprobando el uso del equipo",
  "computerUse.unavailable.title": "El uso del equipo aún no está disponible",
  "computerUse.permissions.title": "Permisos del sistema",
  "computerUse.permissions.description": "macOS gestiona los permisos.",
  "computerUse.ready.title": "El uso del equipo está listo",
  "computerUse.ready.description":
    "OpenBot Code puede ver las aplicaciones de este equipo e interactuar con ellas. Este sistema no solicita permisos adicionales.",
  "computerUse.limited.title": "El uso del equipo está limitado en este escritorio",
  "computerUse.openSettingsFailed.title": "No se pudieron abrir los Ajustes del Sistema",
  "computerUse.restartRequired.title": "Hay que reiniciar",
  "computerUse.restartRequired.description":
    "macOS sigue bloqueando los clics y la escritura. Si vuelve a pasar tras reiniciar, quita OpenBot Code de Accesibilidad y añádelo de nuevo.",
  "computerUse.restartRequired.action": "Reiniciar OpenBot Code",
  "computerUse.compact.title": "Activar el uso del equipo",
  "computerUse.compact.description":
    "Permite que OpenBot Code vea las aplicaciones de este equipo e interactúe con ellas.",
  "computerUse.granted": "Concedido",
  "computerUse.opening": "Abriendo…",
  "computerUse.manage": "Gestionar",
  "computerUse.grant": "Conceder",
  "computerUse.manageLabel": "Gestionar {permission}",
  "computerUse.grantLabel": "Conceder {permission}",
  "computerUse.help.title": "Activa {permission}",
  "computerUse.help.paneOpen": "Los Ajustes del Sistema están abiertos en {pane}.",
  "computerUse.help.dragLabel": "Arrastra {name} a los Ajustes del Sistema o pulsa para mostrarlo en Finder",
  "computerUse.help.dragToAdd": "Arrastra para añadir",
  "computerUse.help.findInList": "Busca {name} en la lista.",
  "computerUse.help.dragIntoList": "Arrastra {name}.app a la lista.",
  "computerUse.help.turnOn": "Activa el interruptor.",
  "computerUse.help.showInFinder": "Mostrar en Finder",
  "computerUse.help.revealFailed": "No se pudo mostrar la aplicación en Finder.",
  "computerUse.help.dragFailed": "No se pudo arrastrar la aplicación.",
  "computerUse.highlight.working": "OpenBot Code está trabajando en {title}",
} as const satisfies PartialTranslation<typeof source>;
