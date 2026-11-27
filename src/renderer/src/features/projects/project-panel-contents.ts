import { ProjectBrowserPanel } from "./ProjectBrowserPanel";
import { ProjectPreviewPanel } from "./ProjectPreviewPanel";
import { slotPanelContents } from "./project-dock-panels";

slotPanelContents.browser = ProjectBrowserPanel;
slotPanelContents.preview = ProjectPreviewPanel;
