<?php
/**
 * Plugin Name:       Crawlvane Fixes
 * Description:       Apply Crawlvane's search and AI-readiness fixes in one click: llms.txt, robots.txt access for AI search, Organization schema and missing meta tags.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Crawlvane
 * License:           GPL-2.0-or-later
 * Text Domain:       crawlvane-fixes
 *
 * How it works: paste a team API key from the Crawlvane dashboard (Settings → API keys), press
 * "Fetch fixes", review them, and apply the ones you want. Everything can be removed again with
 * one button. Nothing is sent anywhere except your site's address to the Crawlvane API.
 */

if (!defined('ABSPATH')) {
    exit;
}

const CRAWLVANE_OPT_SETTINGS = 'crawlvane_fixes_settings';
const CRAWLVANE_OPT_PENDING  = 'crawlvane_fixes_pending';
const CRAWLVANE_OPT_ACTIVE   = 'crawlvane_fixes_active';
const CRAWLVANE_PARTS        = ['robotsTxt', 'llmsTxt', 'schemaHtml', 'headTags'];

function crawlvane_settings(): array {
    $s = get_option(CRAWLVANE_OPT_SETTINGS, []);
    return [
        'api_key'  => isset($s['api_key']) ? (string) $s['api_key'] : '',
        'api_base' => isset($s['api_base']) && $s['api_base'] !== '' ? untrailingslashit((string) $s['api_base']) : 'https://crawlvane.com',
    ];
}

function crawlvane_labels(): array {
    return [
        'robotsTxt'  => __('robots.txt with AI search access', 'crawlvane-fixes'),
        'llmsTxt'    => __('llms.txt (a map of your key pages for AI tools)', 'crawlvane-fixes'),
        'schemaHtml' => __('Organization and WebSite schema on the home page', 'crawlvane-fixes'),
        'headTags'   => __('Missing meta and social tags on the home page', 'crawlvane-fixes'),
    ];
}

/* ---------- Admin page ---------- */

add_action('admin_menu', function () {
    add_options_page('Crawlvane Fixes', 'Crawlvane', 'manage_options', 'crawlvane-fixes', 'crawlvane_render_admin');
});

add_action('admin_post_crawlvane_save', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed.');
    }
    check_admin_referer('crawlvane_save');
    $key  = isset($_POST['api_key']) ? sanitize_text_field(wp_unslash($_POST['api_key'])) : '';
    $base = isset($_POST['api_base']) ? esc_url_raw(wp_unslash($_POST['api_base']), ['https']) : '';
    update_option(CRAWLVANE_OPT_SETTINGS, ['api_key' => $key, 'api_base' => $base], false);
    crawlvane_back('saved');
});

add_action('admin_post_crawlvane_fetch', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed.');
    }
    check_admin_referer('crawlvane_fetch');
    $s = crawlvane_settings();
    if ($s['api_key'] === '') {
        crawlvane_back('nokey');
    }
    $res = wp_remote_get($s['api_base'] . '/api/v1/fixes?url=' . rawurlencode(home_url('/')), [
        'timeout' => 90,
        'headers' => ['Authorization' => 'Bearer ' . $s['api_key']],
    ]);
    if (is_wp_error($res)) {
        set_transient('crawlvane_error', $res->get_error_message(), 300);
        crawlvane_back('error');
    }
    $body = json_decode(wp_remote_retrieve_body($res), true);
    if (wp_remote_retrieve_response_code($res) !== 200 || !is_array($body)) {
        set_transient('crawlvane_error', is_array($body) && isset($body['error']) ? (string) $body['error'] : 'The Crawlvane API didn\'t answer.', 300);
        crawlvane_back('error');
    }
    $pending = [];
    foreach (CRAWLVANE_PARTS as $part) {
        $pending[$part] = isset($body[$part]) && is_string($body[$part]) ? $body[$part] : '';
    }
    update_option(CRAWLVANE_OPT_PENDING, $pending, false);
    crawlvane_back('fetched');
});

add_action('admin_post_crawlvane_apply', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed.');
    }
    check_admin_referer('crawlvane_apply');
    $pending = get_option(CRAWLVANE_OPT_PENDING, []);
    $chosen  = isset($_POST['parts']) && is_array($_POST['parts']) ? array_map('sanitize_key', wp_unslash($_POST['parts'])) : [];
    $active  = get_option(CRAWLVANE_OPT_ACTIVE, []);
    foreach (CRAWLVANE_PARTS as $part) {
        if (in_array(strtolower($part), $chosen, true) && !empty($pending[$part])) {
            $active[$part] = $pending[$part];
        }
    }
    update_option(CRAWLVANE_OPT_ACTIVE, $active, true);
    flush_rewrite_rules();
    crawlvane_back('applied');
});

add_action('admin_post_crawlvane_remove', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed.');
    }
    check_admin_referer('crawlvane_remove');
    delete_option(CRAWLVANE_OPT_ACTIVE);
    crawlvane_back('removed');
});

function crawlvane_back(string $msg) {
    wp_safe_redirect(add_query_arg(['page' => 'crawlvane-fixes', 'cv' => $msg], admin_url('options-general.php')));
    exit;
}

function crawlvane_render_admin() {
    if (!current_user_can('manage_options')) {
        return;
    }
    $s       = crawlvane_settings();
    $pending = get_option(CRAWLVANE_OPT_PENDING, []);
    $active  = get_option(CRAWLVANE_OPT_ACTIVE, []);
    $labels  = crawlvane_labels();
    $msg     = isset($_GET['cv']) ? sanitize_key(wp_unslash($_GET['cv'])) : '';
    $notices = [
        'saved'   => __('Settings saved.', 'crawlvane-fixes'),
        'nokey'   => __('Add your API key first.', 'crawlvane-fixes'),
        'fetched' => __('Fixes fetched. Review them below, then apply the ones you want.', 'crawlvane-fixes'),
        'applied' => __('Applied. Check your site to make sure everything looks right.', 'crawlvane-fixes'),
        'removed' => __('All Crawlvane fixes were removed.', 'crawlvane-fixes'),
    ];
    echo '<div class="wrap"><h1>Crawlvane Fixes</h1>';
    if ($msg === 'error') {
        echo '<div class="notice notice-error"><p>' . esc_html((string) get_transient('crawlvane_error')) . '</p></div>';
    } elseif (isset($notices[$msg])) {
        echo '<div class="notice notice-success"><p>' . esc_html($notices[$msg]) . '</p></div>';
    }
    if (file_exists(ABSPATH . 'robots.txt')) {
        echo '<div class="notice notice-warning"><p>' . esc_html__('Your site has a robots.txt file on the server, so WordPress (and this plugin) can\'t change it. Edit that file instead, or delete it to let the plugin manage robots.txt.', 'crawlvane-fixes') . '</p></div>';
    }

    echo '<h2>' . esc_html__('1. Connect', 'crawlvane-fixes') . '</h2><form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
    wp_nonce_field('crawlvane_save');
    echo '<input type="hidden" name="action" value="crawlvane_save"><table class="form-table"><tr><th><label for="cv-key">' . esc_html__('API key', 'crawlvane-fixes') . '</label></th><td><input id="cv-key" name="api_key" type="password" class="regular-text" value="' . esc_attr($s['api_key']) . '" autocomplete="off"><p class="description">' . esc_html__('From your Crawlvane dashboard: Settings → API keys.', 'crawlvane-fixes') . '</p></td></tr>';
    echo '<tr><th><label for="cv-base">' . esc_html__('Crawlvane address', 'crawlvane-fixes') . '</label></th><td><input id="cv-base" name="api_base" type="url" class="regular-text" value="' . esc_attr($s['api_base']) . '"></td></tr></table>';
    submit_button(__('Save', 'crawlvane-fixes'));
    echo '</form>';

    echo '<h2>' . esc_html__('2. Fetch fixes for this site', 'crawlvane-fixes') . '</h2><form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
    wp_nonce_field('crawlvane_fetch');
    echo '<input type="hidden" name="action" value="crawlvane_fetch"><p>' . esc_html(sprintf(__('Checks %s and builds the fixes it needs. Takes up to a minute.', 'crawlvane-fixes'), home_url('/'))) . '</p>';
    submit_button(__('Fetch fixes', 'crawlvane-fixes'), 'secondary');
    echo '</form>';

    if (array_filter($pending)) {
        echo '<h2>' . esc_html__('3. Review and apply', 'crawlvane-fixes') . '</h2><form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        wp_nonce_field('crawlvane_apply');
        echo '<input type="hidden" name="action" value="crawlvane_apply">';
        foreach (CRAWLVANE_PARTS as $part) {
            if (empty($pending[$part])) {
                continue;
            }
            echo '<p><label><input type="checkbox" name="parts[]" value="' . esc_attr(strtolower($part)) . '" checked> <strong>' . esc_html($labels[$part]) . '</strong></label>' . (!empty($active[$part]) ? ' <em>(' . esc_html__('active; applying replaces it', 'crawlvane-fixes') . ')</em>' : '') . '</p>';
            echo '<textarea readonly rows="8" class="large-text code">' . esc_textarea($pending[$part]) . '</textarea>';
        }
        submit_button(__('Apply selected fixes', 'crawlvane-fixes'));
        echo '</form>';
    }

    if (array_filter($active)) {
        echo '<h2>' . esc_html__('Active fixes', 'crawlvane-fixes') . '</h2><ul style="list-style:disc;padding-left:20px">';
        foreach (CRAWLVANE_PARTS as $part) {
            if (!empty($active[$part])) {
                echo '<li>' . esc_html($labels[$part]) . '</li>';
            }
        }
        echo '</ul><form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        wp_nonce_field('crawlvane_remove');
        echo '<input type="hidden" name="action" value="crawlvane_remove">';
        submit_button(__('Remove all Crawlvane fixes', 'crawlvane-fixes'), 'delete');
        echo '</form>';
    }
    echo '</div>';
}

/* ---------- Applying the fixes on the site ---------- */

function crawlvane_active(string $part): string {
    $active = get_option(CRAWLVANE_OPT_ACTIVE, []);
    return isset($active[$part]) && is_string($active[$part]) ? $active[$part] : '';
}

// robots.txt: WordPress serves a virtual one when there's no file; replace its content.
add_filter('robots_txt', function ($output, $public) {
    $robots = crawlvane_active('robotsTxt');
    return ($robots !== '' && $public) ? $robots : $output;
}, 99, 2);

// llms.txt at the site root.
add_action('init', function () {
    add_rewrite_rule('^llms\.txt$', 'index.php?crawlvane_llms=1', 'top');
});
add_filter('query_vars', function ($vars) {
    $vars[] = 'crawlvane_llms';
    return $vars;
});
add_action('template_redirect', function () {
    if (!get_query_var('crawlvane_llms')) {
        return;
    }
    $llms = crawlvane_active('llmsTxt');
    if ($llms === '') {
        status_header(404);
        exit;
    }
    header('Content-Type: text/plain; charset=utf-8');
    echo $llms; // Plain text; the browser shows it as text, never as HTML.
    exit;
});

// Home page: schema (re-encoded so only JSON can reach the page) and missing meta tags.
add_action('wp_head', function () {
    if (!is_front_page()) {
        return;
    }
    $schema = crawlvane_active('schemaHtml');
    if ($schema !== '' && preg_match_all('#<script[^>]*application/ld\+json[^>]*>(.*?)</script>#is', $schema, $m)) {
        foreach ($m[1] as $json) {
            $data = json_decode(trim($json), true);
            if (is_array($data)) {
                echo "<script type=\"application/ld+json\">" . wp_json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) . "</script>\n";
            }
        }
    }
    $tags = crawlvane_active('headTags');
    if ($tags !== '') {
        // Only <meta> and <link> tags; the theme already prints <title>.
        echo wp_kses($tags, [
            'meta' => ['name' => true, 'property' => true, 'content' => true, 'charset' => true],
            'link' => ['rel' => true, 'href' => true, 'type' => true, 'sizes' => true],
        ]) . "\n";
    }
}, 5);

register_activation_hook(__FILE__, function () {
    add_rewrite_rule('^llms\.txt$', 'index.php?crawlvane_llms=1', 'top');
    flush_rewrite_rules();
});
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');
