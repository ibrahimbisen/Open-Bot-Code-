import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/reply";

export const messages = {
  "reply.summary.edited": {
    one: "edytowano {count} plik",
    few: "edytowano {count} pliki",
    many: "edytowano {count} plików",
    other: "edytowano {count} pliku",
  },
  "reply.summary.ran": {
    one: "uruchomiono {count} polecenie",
    few: "uruchomiono {count} polecenia",
    many: "uruchomiono {count} poleceń",
    other: "uruchomiono {count} polecenia",
  },
  "reply.summary.read": {
    one: "odczytano {count} plik",
    few: "odczytano {count} pliki",
    many: "odczytano {count} plików",
    other: "odczytano {count} pliku",
  },
  "reply.summary.searched": {
    one: "szukano {count} raz",
    few: "szukano {count} razy",
    many: "szukano {count} razy",
    other: "szukano {count} razy",
  },
  "reply.summary.browsed": {
    one: "otwarto {count} stronę",
    few: "otwarto {count} strony",
    many: "otwarto {count} stron",
    other: "otwarto {count} strony",
  },
  "reply.summary.delegated": {
    one: "przekazano {count} zadanie",
    few: "przekazano {count} zadania",
    many: "przekazano {count} zadań",
    other: "przekazano {count} zadania",
  },
  "reply.summary.worked": {
    one: "użyto {count} innego narzędzia",
    few: "użyto {count} innych narzędzi",
    many: "użyto {count} innych narzędzi",
    other: "użyto {count} innych narzędzi",
  },
  "reply.details.show": "Szczegóły",
  "reply.details.hide": "Ukryj szczegóły",
  "reply.details.loading": "Wczytywanie szczegółów…",
  "reply.details.input": "Dane wejściowe",
  "reply.details.output": "Dane wyjściowe",
  "reply.details.shortened": "Skrócono",
  "reply.details.timeline": "Oś czasu",
  "reply.code.showAll": "Pokaż wszystko ({count} wierszy)",
  "reply.code.showLess": "Pokaż mniej",
  "reply.view.title": "Widok odpowiedzi",
  "reply.view.description":
    "Krótki pokazuje odpowiedź i jednowierszowe podsumowanie pracy. Szczegółowy pokazuje także kroki.",
  "reply.view.short": "Krótki",
  "reply.view.detailed": "Szczegółowy",
  "reply.rule.title": "Reguła odpowiedzi",
  "reply.rule.description": "Każdy czat dostaje tę regułę. Projekty mogą używać własnej reguły.",
  "reply.rule.label": "Reguła odpowiedzi",
  "reply.rule.save": "Zapisz regułę",
  "reply.rule.reset": "Użyj reguły domyślnej",
  "reply.rule.saved": "Reguła zapisana",
  "reply.rule.empty": "Puste: nie jest wysyłana żadna reguła odpowiedzi",
  "reply.rule.count": "{count} z {max} znaków",
} as const satisfies PartialTranslation<typeof source>;
