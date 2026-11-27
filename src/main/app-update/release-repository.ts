import { RELEASE_REPOSITORY } from "@codebot/contracts/release-repository";

export const RELEASE_FEED_URL = `https://github.com/${RELEASE_REPOSITORY}/releases/latest/download/`;

const GITHUB_RELEASE_FEED =
  /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/releases\/latest\/download\/$/u;
const STABLE_VERSION = /^\d+\.\d+\.\d+$/u;

export function githubReleaseRepository(feedUrl: string): string | null {
  const match = GITHUB_RELEASE_FEED.exec(feedUrl);
  return match ? `${match[1]}/${match[2]}` : null;
}

export function releasePageUrl(feedUrl: string, version?: string | null): string | null {
  const repository = githubReleaseRepository(feedUrl);
  if (repository === null) return null;
  const page = version && STABLE_VERSION.test(version) ? `tag/v${version}` : "latest";
  return `https://github.com/${repository}/releases/${page}`;
}
