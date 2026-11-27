import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "Funciones avanzadas",
  "advanced.tab.description": "Activa funciones que están ocultas de forma predeterminada.",
  "advanced.section.title": "Funciones ocultas",
  "advanced.section.description":
    "Cada interruptor muestra u oculta una función en {server}. Una función desactivada no tiene botones, ajustes ni herramientas de agente. Tus datos se conservan.",
  "advanced.adminOnly": "Solo un propietario o un administrador de este servidor puede cambiar estos interruptores.",
  "advanced.loadFailed": "OpenBot Code no pudo leer los interruptores de este servidor.",
  "advanced.saveFailed": "OpenBot Code no pudo guardar el interruptor.",
  "advanced.routines.title": "Rutinas",
  "advanced.routines.description":
    "Tareas programadas y webhooks. Añade Programación a la barra izquierda y Rutinas a los ajustes del agente.",
  "advanced.channels.title": "Canales",
  "advanced.channels.description": "Muchos agentes en un chat. Añade Canales a la barra izquierda.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "Skills, agentes y plugins para instalar. Añade el botón Marketplace.",
  "advanced.chatApps.title": "Slack, Discord, Telegram y WhatsApp",
  "advanced.chatApps.description": "Conecta agentes a apps de chat. Añade los conectores de apps de chat.",
  "advanced.chatApps.open.title": "Conexiones de apps de chat",
  "advanced.chatApps.open.description": "Conecta Slack, Discord, Telegram o WhatsApp.",
  "advanced.chatApps.open.action": "Abrir",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "Permite que un agente vea y controle apps en este ordenador. Añade los ajustes de Computer Use.",
  "advanced.remoteDesktop.title": "Escritorio remoto",
  "advanced.remoteDesktop.description": "Controla la pantalla de este ordenador desde otro dispositivo.",
} as const satisfies PartialTranslation<typeof source>;
