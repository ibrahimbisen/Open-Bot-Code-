export const SOCIAL_NETWORK_IDS = ["x", "threads", "linkedin", "reddit", "instagram", "tiktok", "facebook"] as const;

export type SocialNetworkId = (typeof SOCIAL_NETWORK_IDS)[number];

export interface SocialNetwork {
  id: SocialNetworkId;
  name: string;
  handle: string;
  kind: "profile" | "community";
  compose: "text" | "link" | "copy";
}

export const SOCIAL_NETWORKS: Record<SocialNetworkId, SocialNetwork> = {
  x: { id: "x", name: "X", handle: "@codebot_x", kind: "profile", compose: "text" },
  threads: { id: "threads", name: "Threads", handle: "@codebot.example", kind: "profile", compose: "text" },
  linkedin: { id: "linkedin", name: "LinkedIn", handle: "CodeBot", kind: "profile", compose: "link" },
  reddit: { id: "reddit", name: "Reddit", handle: "r/CodeBot_", kind: "community", compose: "text" },
  instagram: { id: "instagram", name: "Instagram", handle: "@codebot.example", kind: "profile", compose: "copy" },
  tiktok: { id: "tiktok", name: "TikTok", handle: "@codebot.example", kind: "profile", compose: "copy" },
  facebook: { id: "facebook", name: "Facebook", handle: "CodeBot", kind: "profile", compose: "link" },
};
