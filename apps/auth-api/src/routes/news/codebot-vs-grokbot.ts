import { createFileRoute } from "@tanstack/solid-router";
import { movedPermanently } from "../../server/moved-content";

export const Route = createFileRoute("/news/codebot-vs-grokbot")({
  server: { handlers: { GET: () => movedPermanently("/compare/grok-bot") } },
});
