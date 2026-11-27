import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/reply";

export const messages = {
  "reply.summary.edited": { one: "editó {count} archivo", other: "editó {count} archivos" },
  "reply.summary.ran": { one: "ejecutó {count} comando", other: "ejecutó {count} comandos" },
  "reply.summary.read": { one: "leyó {count} archivo", other: "leyó {count} archivos" },
  "reply.summary.searched": { one: "buscó {count} vez", other: "buscó {count} veces" },
  "reply.summary.browsed": { one: "abrió {count} página", other: "abrió {count} páginas" },
  "reply.summary.delegated": { one: "delegó {count} tarea", other: "delegó {count} tareas" },
  "reply.summary.worked": { one: "usó {count} otra herramienta", other: "usó {count} otras herramientas" },
  "reply.details.show": "Detalles",
  "reply.details.hide": "Ocultar detalles",
  "reply.details.loading": "Cargando detalles…",
  "reply.details.input": "Entrada",
  "reply.details.output": "Salida",
  "reply.details.shortened": "Acortado",
  "reply.details.timeline": "Cronología",
  "reply.code.showAll": "Mostrar todo ({count} líneas)",
  "reply.code.showLess": "Mostrar menos",
  "reply.view.title": "Vista de respuesta",
  "reply.view.description":
    "Corta muestra la respuesta y un resumen de una línea del trabajo. Detallada muestra también los pasos.",
  "reply.view.short": "Corta",
  "reply.view.detailed": "Detallada",
  "reply.rule.title": "Regla de respuesta",
  "reply.rule.description": "Cada chat recibe esta regla. Los proyectos pueden usar su propia regla.",
  "reply.rule.label": "Regla de respuestas",
  "reply.rule.save": "Guardar regla",
  "reply.rule.reset": "Usar regla predeterminada",
  "reply.rule.saved": "Regla guardada",
  "reply.rule.empty": "Vacía: no se envía ninguna regla de respuesta",
  "reply.rule.count": "{count} de {max} caracteres",
} as const satisfies PartialTranslation<typeof source>;
