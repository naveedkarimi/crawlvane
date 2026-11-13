/** JSON for a <script type="application/ld+json"> tag. "<" is escaped so no value can close the tag early. */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
