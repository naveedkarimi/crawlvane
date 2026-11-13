=== Crawlvane Fixes ===
Contributors: crawlvane
Tags: seo, llms.txt, robots.txt, schema, ai search
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Apply Crawlvane's search and AI-readiness fixes in one click.

== Description ==

Crawlvane audits websites for search engines, answer engines and AI assistants. This plugin applies its fixes to your WordPress site:

* **llms.txt** at your site root: a map of your key pages for AI tools.
* **robots.txt** that lets AI search crawlers read your site (training crawlers stay your choice).
* **Organization and WebSite schema** on your home page.
* **Missing meta and social tags** on your home page.

You review every fix before it's applied, and one button removes them all.

== Installation ==

1. Upload the `crawlvane-fixes` folder to `/wp-content/plugins/`, or zip it and use Plugins → Add New → Upload.
2. Activate it.
3. Go to Settings → Crawlvane, paste a team API key from your Crawlvane dashboard (Settings → API keys) and save.
4. Press "Fetch fixes", review them, and apply the ones you want.

== Frequently Asked Questions ==

= My robots.txt didn't change =
If a real robots.txt file sits in your site's root folder, WordPress can't change it. Edit that file, or delete it so the plugin can manage robots.txt.

= What data does the plugin send? =
Only your site's address, to the Crawlvane API, when you press "Fetch fixes".

== Changelog ==

= 1.0.0 =
* First release.
