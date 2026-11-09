/** Schema.org JSON-LD generator: form specs per type and a builder that drops empty fields. */

export type SchemaKind = "Organization" | "LocalBusiness" | "Person" | "Article" | "FAQPage" | "Product";

export interface Field {
  key: string;
  label: string;
  kind?: "text" | "url" | "lines" | "textarea" | "date" | "select";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  hint?: string;
}

const sameAs: Field = {
  key: "sameAs",
  label: "Profile links (one per line)",
  kind: "lines",
  placeholder: "https://www.linkedin.com/company/your-business\nhttps://www.youtube.com/@yourbusiness",
  hint: "Your real profiles. They help search engines and AI connect your site to your brand.",
};

export const SCHEMA_KINDS: { kind: SchemaKind; label: string; use: string; fields: Field[] }[] = [
  {
    kind: "Organization",
    label: "Organization",
    use: "Homepage of a company, brand or online business.",
    fields: [
      { key: "name", label: "Business name", required: true, placeholder: "Acme Coffee Roasters" },
      { key: "url", label: "Website", kind: "url", required: true, placeholder: "https://acme.com" },
      { key: "logo", label: "Logo URL", kind: "url", placeholder: "https://acme.com/logo.png" },
      { key: "description", label: "Short description", kind: "textarea", placeholder: "Small-batch coffee roaster in Leeds, shipping across the UK." },
      { key: "email", label: "Email", placeholder: "hello@acme.com" },
      { key: "telephone", label: "Phone", placeholder: "+44 113 000 0000" },
      sameAs,
    ],
  },
  {
    kind: "LocalBusiness",
    label: "Local business",
    use: "A shop, office or service with an address or service area.",
    fields: [
      { key: "type", label: "Business type", kind: "select", options: ["LocalBusiness", "Restaurant", "CafeOrCoffeeShop", "Store", "ProfessionalService", "HomeAndConstructionBusiness", "HealthAndBeautyBusiness", "MedicalBusiness", "Dentist", "LegalService", "AutomotiveBusiness", "RealEstateAgent"] },
      { key: "name", label: "Business name", required: true },
      { key: "url", label: "Website", kind: "url", required: true },
      { key: "image", label: "Photo or logo URL", kind: "url" },
      { key: "telephone", label: "Phone" },
      { key: "streetAddress", label: "Street address" },
      { key: "addressLocality", label: "Town or city" },
      { key: "addressRegion", label: "State or region" },
      { key: "postalCode", label: "Postcode" },
      { key: "addressCountry", label: "Country code", placeholder: "US, GB, CA..." },
      { key: "openingHours", label: "Opening hours (one per line)", kind: "lines", placeholder: "Mo-Fr 09:00-17:00\nSa 10:00-14:00" },
      { key: "priceRange", label: "Price range", placeholder: "$$" },
      sameAs,
    ],
  },
  {
    kind: "Person",
    label: "Person",
    use: "A personal site, portfolio or author page.",
    fields: [
      { key: "name", label: "Full name", required: true },
      { key: "url", label: "Website", kind: "url" },
      { key: "image", label: "Photo URL", kind: "url" },
      { key: "jobTitle", label: "Job title", placeholder: "Full-stack engineer" },
      { key: "worksFor", label: "Company" },
      { key: "description", label: "Short bio", kind: "textarea" },
      sameAs,
    ],
  },
  {
    kind: "Article",
    label: "Article or blog post",
    use: "A blog post, guide or news article.",
    fields: [
      { key: "headline", label: "Headline", required: true },
      { key: "url", label: "Article URL", kind: "url" },
      { key: "description", label: "Summary", kind: "textarea" },
      { key: "image", label: "Main image URL", kind: "url" },
      { key: "authorName", label: "Author name", required: true },
      { key: "authorUrl", label: "Author page URL", kind: "url" },
      { key: "publisher", label: "Publisher (site or company name)" },
      { key: "publisherLogo", label: "Publisher logo URL", kind: "url" },
      { key: "datePublished", label: "Published", kind: "date" },
      { key: "dateModified", label: "Last updated", kind: "date" },
    ],
  },
  {
    kind: "FAQPage",
    label: "FAQ",
    use: "Questions and answers that are visible on the page.",
    fields: [],
  },
  {
    kind: "Product",
    label: "Product",
    use: "A product page with a price.",
    fields: [
      { key: "name", label: "Product name", required: true },
      { key: "url", label: "Product URL", kind: "url" },
      { key: "image", label: "Image URL", kind: "url" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "brand", label: "Brand" },
      { key: "sku", label: "SKU" },
      { key: "price", label: "Price", placeholder: "29.99" },
      { key: "priceCurrency", label: "Currency", placeholder: "USD" },
      { key: "availability", label: "Availability", kind: "select", options: ["InStock", "OutOfStock", "PreOrder", "BackOrder", "Discontinued"] },
      { key: "ratingValue", label: "Average rating (only if reviews are shown on the page)", placeholder: "4.6" },
      { key: "reviewCount", label: "Number of reviews", placeholder: "38" },
    ],
  },
];

export type Values = Record<string, string>;
export interface Faq { q: string; a: string }

const v = (s: string | undefined) => (s ?? "").trim();
const lines = (s: string | undefined) => v(s).split("\n").map((l) => l.trim()).filter(Boolean);

/** Remove empty strings, empty arrays and objects that only have an @type. */
function prune<T>(o: T): T {
  if (Array.isArray(o)) return o.map(prune).filter((x) => x !== undefined) as T;
  if (o && typeof o === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) {
      const p = prune(val);
      if (p === "" || p === undefined || (Array.isArray(p) && !p.length)) continue;
      if (p && typeof p === "object" && !Array.isArray(p) && Object.keys(p).every((key) => key === "@type")) continue;
      out[k] = p;
    }
    return out as T;
  }
  return o;
}

export function buildSchema(kind: SchemaKind, x: Values, faqs: Faq[] = []): Record<string, unknown> {
  const base = { "@context": "https://schema.org" };
  switch (kind) {
    case "Organization":
      return prune({ ...base, "@type": "Organization", name: v(x.name), url: v(x.url), logo: v(x.logo), description: v(x.description), email: v(x.email), telephone: v(x.telephone), sameAs: lines(x.sameAs) });
    case "LocalBusiness":
      return prune({
        ...base,
        "@type": v(x.type) || "LocalBusiness",
        name: v(x.name),
        url: v(x.url),
        image: v(x.image),
        telephone: v(x.telephone),
        priceRange: v(x.priceRange),
        address: { "@type": "PostalAddress", streetAddress: v(x.streetAddress), addressLocality: v(x.addressLocality), addressRegion: v(x.addressRegion), postalCode: v(x.postalCode), addressCountry: v(x.addressCountry) },
        openingHours: lines(x.openingHours),
        sameAs: lines(x.sameAs),
      });
    case "Person":
      return prune({ ...base, "@type": "Person", name: v(x.name), url: v(x.url), image: v(x.image), jobTitle: v(x.jobTitle), description: v(x.description), worksFor: { "@type": "Organization", name: v(x.worksFor) }, sameAs: lines(x.sameAs) });
    case "Article":
      return prune({
        ...base,
        "@type": "Article",
        headline: v(x.headline),
        description: v(x.description),
        image: v(x.image),
        mainEntityOfPage: v(x.url),
        author: { "@type": "Person", name: v(x.authorName), url: v(x.authorUrl) },
        publisher: { "@type": "Organization", name: v(x.publisher), logo: { "@type": "ImageObject", url: v(x.publisherLogo) } },
        datePublished: v(x.datePublished),
        dateModified: v(x.dateModified) || v(x.datePublished),
      });
    case "FAQPage":
      return prune({
        ...base,
        "@type": "FAQPage",
        mainEntity: faqs
          .filter((f) => v(f.q) && v(f.a))
          .map((f) => ({ "@type": "Question", name: v(f.q), acceptedAnswer: { "@type": "Answer", text: v(f.a) } })),
      });
    case "Product": {
      const rated = v(x.ratingValue) && v(x.reviewCount);
      return prune({
        ...base,
        "@type": "Product",
        name: v(x.name),
        url: v(x.url),
        image: v(x.image),
        description: v(x.description),
        brand: { "@type": "Brand", name: v(x.brand) },
        sku: v(x.sku),
        offers: v(x.price)
          ? { "@type": "Offer", price: v(x.price), priceCurrency: v(x.priceCurrency).toUpperCase() || "USD", availability: `https://schema.org/${v(x.availability) || "InStock"}`, url: v(x.url) }
          : undefined,
        aggregateRating: rated ? { "@type": "AggregateRating", ratingValue: v(x.ratingValue), reviewCount: v(x.reviewCount) } : undefined,
      });
    }
  }
}

/** Plain-English warnings about missing or risky values. */
export function schemaWarnings(kind: SchemaKind, x: Values, faqs: Faq[] = []): string[] {
  const w: string[] = [];
  const spec = SCHEMA_KINDS.find((s) => s.kind === kind)!;
  for (const f of spec.fields) if (f.required && !v(x[f.key])) w.push(`Add the ${f.label.toLowerCase()}.`);
  for (const f of spec.fields)
    if (f.kind === "url" && v(x[f.key]) && !/^https?:\/\//i.test(v(x[f.key]))) w.push(`${f.label} should be a full URL starting with https://.`);
  for (const l of lines(x.sameAs)) if (!/^https?:\/\//i.test(l)) w.push(`Profile link "${l}" should start with https://.`);
  if (kind === "FAQPage" && !faqs.some((f) => v(f.q) && v(f.a))) w.push("Add at least one question with an answer.");
  if (kind === "Product" && v(x.price) && !/^\d+(\.\d+)?$/.test(v(x.price))) w.push("Price should be a number such as 29.99, with no currency sign.");
  if (kind === "Product" && (v(x.ratingValue) || v(x.reviewCount)))
    w.push("Only add ratings if real reviews are visible on the page. Marking up hidden or invented reviews breaks Google's guidelines.");
  if (kind === "FAQPage") w.push("Google stopped showing FAQ rich results in May 2026. The markup is still valid, but it won't change how your page looks in Google.");
  return w;
}

export const toScriptTag = (data: unknown) => `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`;
