export interface ProjectDockHook {
  openContent(request: {
    kind: "preview" | "browser";
    projectId: string;
    title: string;
    data: Record<string, string>;
    activate: boolean;
    pinned?: boolean;
  }): void;
  openSlot(request: {
    kind: "file" | "diff" | "browser" | "preview";
    projectId: string;
    title: string;
    data: Record<string, string>;
    placement: "active" | "right" | "below";
  }): void;
  closeTransient(reason: string): void;
  closeActive(): void;
  panelCount(): number;
}

declare global {
  interface Window {
    __codebotProjectDock?: ProjectDockHook;
  }
}
