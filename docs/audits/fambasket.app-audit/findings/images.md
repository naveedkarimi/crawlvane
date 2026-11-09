# Image SEO

## Evidence
- 16 rendered images.
- Product imagery uses descriptive alt text such as `FamBasket app showing a shared shopping list with claimed items, weekly shop progress, and the household budget`.
- Images include intrinsic width and height attributes.
- Most below-fold assets use lazy loading.
- Open Graph image is configured at 1200x630.

## Findings

### Medium: verify hero transfer size and responsive delivery
Hero assets are high resolution (`2200x1123`) and visually dominant. Confirm WebP/AVIF delivery, responsive `srcset` and `sizes`, and that only the active light/dark asset is fetched.

### High: align schema and image assets
The SoftwareApplication schema references a `.png` hero screenshot while the page uses `.webp`; validate the referenced URL and correct the schema or publish the referenced asset.

## Positives
Alt text quality, dimensions, lazy loading, and social preview dimensions are strong.