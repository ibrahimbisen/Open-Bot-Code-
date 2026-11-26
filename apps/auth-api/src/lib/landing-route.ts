import type { landingPageText } from "./landing-page-text";
import { type loadSitePage, SITE_OPEN_GRAPH_LOCALES } from "./site-locale";
import { CODEBOT_SITE_URL, codeBotHomeHead, type HomePageHead } from "./site-metadata";
import { pagePaths, SITE_LOCALES, siteHreflang } from "./site-paths";
import { CODEBOT_SOFTWARE_APPLICATION } from "./software-application";

type LandingPageData = Awaited<ReturnType<typeof loadSitePage<ReturnType<typeof landingPageText>>>>;

export function landingHead(siteUrl: string, path: string, data: LandingPageData | undefined) {
  if (!data) return { links: [{ rel: "canonical", href: new URL(path, CODEBOT_SITE_URL).toString() }] };
  const locale = data.site.locale;
  const head: HomePageHead = {
    title: data.text.title,
    description: data.text.description,
    questions: data.text.faq.questions,
    path,
    openGraphLocale: SITE_OPEN_GRAPH_LOCALES[locale],
    alternates: SITE_LOCALES.map((alternate) => ({
      hreflang: siteHreflang(alternate),
      path: pagePaths("/")[alternate],
    })),
  };
  return codeBotHomeHead(CODEBOT_SOFTWARE_APPLICATION, siteUrl, head);
}
