import { version } from "../../../../package.json";
import channelScreenshot from "../content/guides/media/codebot-101/a-channel.webp";
import { CODEBOT_SITE_URL, codeBotSoftwareApplication } from "./site-metadata";

export const CODEBOT_SOFTWARE_APPLICATION = codeBotSoftwareApplication({
  version,
  screenshot: new URL(channelScreenshot, CODEBOT_SITE_URL).toString(),
});
