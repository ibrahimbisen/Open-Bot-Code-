import { faqStructuredData, type LandingQuestion } from "./landing-faq";
import { CODEBOT_ALTERNATE_DOWNLOAD_LINKS, CODEBOT_DOWNLOAD_LINKS, CODEBOT_LINKS } from "./landing-links";

export const CODEBOT_SITE_URL = "https://codebot.example/";
export const CODEBOT_SITE_TITLE = "CodeBot: Run a team of AI agents on your computer";
export const CODEBOT_SITE_DESCRIPTION =
  "A free desktop app that runs AI agents as a team on your own computer, with the ChatGPT, Claude, Gemini or Grok plan you already pay for, or your own model.";
export const CODEBOT_SOCIAL_IMAGE_URL = `${CODEBOT_SITE_URL}codebot-social.png`;
export const CODEBOT_X_HANDLE = "@codebot_x";
const CODEBOT_X_URL = "https://codebot.example/x";
const CODEBOT_REPOSITORY_URL = "https://github.com/your-org/codebot";
const CODEBOT_PRODUCT_HUNT_URL = "https://www.producthunt.com/products/codebot-3";
const CODEBOT_LICENSE_URL = "https://polyformproject.org/licenses/noncommercial/1.0.0/";
const CODEBOT_ORGANIZATION_ID = `${CODEBOT_SITE_URL}#organization`;
const CODEBOT_WEBSITE_ID = `${CODEBOT_SITE_URL}#website`;
const CODEBOT_APPLICATION_ID = `${CODEBOT_SITE_URL}#app`;
export const CODEBOT_LOGO_URL = `${CODEBOT_SITE_URL}icon-512x512.png`;
export const CODEBOT_SOCIAL_IMAGE_ALT = "Meet CodeBot on a dark grid background";

export const CODEBOT_SOCIAL_IMAGE_META = [
  { property: "og:image", content: CODEBOT_SOCIAL_IMAGE_URL },
  { property: "og:image:type", content: "image/png" },
  { property: "og:image:width", content: "1600" },
  { property: "og:image:height", content: "900" },
  { property: "og:image:alt", content: CODEBOT_SOCIAL_IMAGE_ALT },
] as const;

export const CODEBOT_SOCIAL_IMAGE_TAGS = {
  openGraph: CODEBOT_SOCIAL_IMAGE_META,
  twitter: [
    { name: "twitter:image", content: CODEBOT_SOCIAL_IMAGE_URL },
    { name: "twitter:image:alt", content: CODEBOT_SOCIAL_IMAGE_ALT },
  ],
} as const;

export interface PageSocialImage {
  path: string;
  alt: string;
}

export const CODEBOT_LEGAL_SOCIAL_IMAGE: PageSocialImage = {
  path: "/social/legal.jpg",
  alt: "Plain terms. No surprises. CodeBot agents beside a paper map",
};

export function pageSocialImageMeta(image: PageSocialImage, siteUrl: string) {
  const url = new URL(image.path, siteUrl).toString();
  return {
    openGraph: [
      { property: "og:image", content: url },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1600" },
      { property: "og:image:height", content: "900" },
      { property: "og:image:alt", content: image.alt },
    ],
    twitter: [
      { name: "twitter:image", content: url },
      { name: "twitter:image:alt", content: image.alt },
    ],
  } as const;
}

const CODEBOT_PRODUCTION_HOSTS = new Set(["codebot.example", "api.codebot.example"]);

export function siteUrlForPage(pageUrl: URL): string {
  return CODEBOT_PRODUCTION_HOSTS.has(pageUrl.hostname) ? CODEBOT_SITE_URL : `${pageUrl.origin}/`;
}

export interface CodeBotApplicationFacts {
  version: string;
  screenshot: string;
}

export function codeBotSoftwareApplication(facts: CodeBotApplicationFacts) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": CODEBOT_APPLICATION_ID,
    name: "CodeBot",
    url: CODEBOT_SITE_URL,
    image: CODEBOT_SOCIAL_IMAGE_URL,
    description: CODEBOT_SITE_DESCRIPTION,
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "AI agent app",
    operatingSystem: [
      "macOS 13 or later (Apple silicon or Intel)",
      "Windows 10 or later (x64)",
      "Linux (x64 or arm64)",
    ],
    downloadUrl: [
      CODEBOT_DOWNLOAD_LINKS.macos,
      CODEBOT_ALTERNATE_DOWNLOAD_LINKS.macos,
      CODEBOT_DOWNLOAD_LINKS.windows,
      CODEBOT_DOWNLOAD_LINKS.linux,
      CODEBOT_ALTERNATE_DOWNLOAD_LINKS.linux,
    ].map((path) => new URL(path, CODEBOT_SITE_URL).toString()),
    featureList: [
      "Runs Codex, Claude Code, Gemini (Antigravity), Grok and OpenCode agents",
      "Uses your ChatGPT, Claude, Google AI Pro or Ultra, or Grok plan",
      "Any OpenAI-compatible model server, also one on your own computer",
      "Agents that work as a team and keep their workspace and history",
      "Chats, files and workspaces stay on your computer",
      "iPhone and Android apps that connect to your own computer",
      "Free for noncommercial use",
    ],
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    softwareVersion: facts.version,
    screenshot: facts.screenshot,
    license: CODEBOT_LICENSE_URL,
    publisher: { "@id": CODEBOT_ORGANIZATION_ID },
    sameAs: [CODEBOT_REPOSITORY_URL, CODEBOT_PRODUCT_HUNT_URL],
  } as const;
}

export type CodeBotSoftwareApplication = ReturnType<typeof codeBotSoftwareApplication>;

const CODEBOT_ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": CODEBOT_ORGANIZATION_ID,
  name: "CodeBot",
  url: CODEBOT_SITE_URL,
  logo: CODEBOT_LOGO_URL,
  sameAs: [
    CODEBOT_REPOSITORY_URL,
    CODEBOT_X_URL,
    CODEBOT_LINKS.threads,
    CODEBOT_LINKS.linkedin,
    CODEBOT_LINKS.reddit,
    CODEBOT_LINKS.instagram,
    CODEBOT_LINKS.tiktok,
    CODEBOT_LINKS.facebook,
    CODEBOT_PRODUCT_HUNT_URL,
  ],
} as const;

const CODEBOT_WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": CODEBOT_WEBSITE_ID,
  name: "CodeBot",
  url: CODEBOT_SITE_URL,
  publisher: { "@id": CODEBOT_ORGANIZATION_ID },
} as const;

export const CODEBOT_SECURITY_HEADERS = {
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
} as const;

export function codeBotRootHead(interLatinFont: string) {
  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: CODEBOT_SITE_TITLE },
      { name: "description", content: CODEBOT_SITE_DESCRIPTION },
      { name: "application-name", content: "CodeBot" },
      { name: "color-scheme", content: "dark" },
      { name: "theme-color", content: "#1a1a1a" },
    ],
    links: [
      {
        rel: "preload",
        as: "font" as const,
        type: "font/woff2",
        href: interLatinFont,
        crossorigin: "anonymous" as const,
      },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  };
}

const CODEBOT_HOME_SOCIAL_IMAGE: PageSocialImage = {
  path: "/social/home.jpg",
  alt: "Models come and go. Your team stays. CodeBot agents on a paper planet",
};

export interface HomePageHead {
  title: string;
  description: string;
  questions: readonly LandingQuestion[];
  path: string;
  openGraphLocale: string;
  alternates: readonly { hreflang: string; path: string }[];
}

export function codeBotHomeHead(application: CodeBotSoftwareApplication, siteUrl: string, page: HomePageHead) {
  const image = pageSocialImageMeta(CODEBOT_HOME_SOCIAL_IMAGE, siteUrl);
  const url = new URL(page.path, CODEBOT_SITE_URL).toString();
  const [fallback] = page.alternates;
  return {
    meta: [
      { title: page.title },
      { name: "description", content: page.description },
      { "script:ld+json": application },
      { "script:ld+json": CODEBOT_ORGANIZATION },
      { "script:ld+json": CODEBOT_WEBSITE },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "CodeBot" },
      { property: "og:locale", content: page.openGraphLocale },
      { property: "og:url", content: url },
      { property: "og:title", content: page.title },
      { property: "og:description", content: page.description },
      ...image.openGraph,
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: CODEBOT_X_HANDLE },
      { name: "twitter:title", content: page.title },
      { name: "twitter:description", content: page.description },
      ...image.twitter,
      { "script:ld+json": faqStructuredData(page.questions) },
    ],
    links: [
      { rel: "canonical", href: url },
      ...page.alternates.map((alternate) => ({
        rel: "alternate",
        hreflang: alternate.hreflang,
        href: new URL(alternate.path, CODEBOT_SITE_URL).toString(),
      })),
      ...(fallback
        ? [{ rel: "alternate", hreflang: "x-default", href: new URL(fallback.path, CODEBOT_SITE_URL).toString() }]
        : []),
    ],
  };
}
