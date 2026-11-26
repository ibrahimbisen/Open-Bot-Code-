import { Link } from "@tanstack/solid-router";
import { CODEBOT_LINKS, EXTERNAL_LINK_REL } from "../../lib/landing-links";

export function DownloadResources() {
  return (
    <p class="download-resources">
      <Link to="/changelog">Release notes</Link>
      <a href={CODEBOT_LINKS.releases} target="_blank" rel={EXTERNAL_LINK_REL}>
        All releases on GitHub
      </a>
      <a href={CODEBOT_LINKS.troubleshooting} target="_blank" rel={EXTERNAL_LINK_REL}>
        Troubleshooting
      </a>
    </p>
  );
}
