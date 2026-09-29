import type { MetadataRoute } from "next";

// Keeps the hidden admin console out of search engine indexes — it's already unlinked from
// nav, this just stops crawlers from finding it on their own.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: "/ops-console-7f2a",
        },
    };
}
