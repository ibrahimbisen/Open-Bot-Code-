import { createSignal } from "solid-js";

interface DevWorktree {
  readonly branch: string | null;
  readonly color: string;
}

const [worktree, setWorktree] = createSignal<DevWorktree | null>(null);

const hot = import.meta.hot;
if (hot) {
  const apply = (next: DevWorktree) => {
    setWorktree(next);
    document.documentElement.style.setProperty("--codebot-logo-dev", next.color);
  };
  hot.on("codebot:dev-worktree", apply);
  hot.send("codebot:dev-worktree-request");
  hot.dispose(() => hot.off("codebot:dev-worktree", apply));
}

export const devWorktree = worktree;
