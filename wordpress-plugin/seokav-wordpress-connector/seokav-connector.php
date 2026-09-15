<?php
/**
 * Plugin Name: Seokav Connector
 * Plugin URI: https://seokav.app
 * Description: اتصال امن و محدود سئوکاو به وردپرس و ووکامرس برای مدیریت دسته‌ها، محصولات و متادیتای سئو.
 * Version: 1.1.1
 * Author: Seokav
 * Requires at least: 6.4
 * Requires PHP: 8.0
 * Text Domain: seokav-connector
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Seokav_Connector {
    const VERSION = '1.1.1';
    const NAMESPACE = 'seokav/v1';
    const KEY_OPTION = 'seokav_connector_key';
    const ORIGINS_OPTION = 'seokav_connector_origins';

    public static function boot() {
        add_action('rest_api_init', [__CLASS__, 'register_routes']);
        add_action('admin_menu', [__CLASS__, 'admin_menu']);
        add_action('admin_post_seokav_save_settings', [__CLASS__, 'save_settings']);
        add_action('admin_init', [__CLASS__, 'ensure_key']);
        add_filter('rest_allowed_cors_headers', [__CLASS__, 'allowed_cors_headers']);
        add_filter('rest_pre_serve_request', [__CLASS__, 'serve_cors'], 10, 4);
    }

    public static function activate() {
        self::ensure_key();
        if (get_option(self::ORIGINS_OPTION, '') === '') {
            update_option(self::ORIGINS_OPTION, 'https://mamadflat.github.io', false);
        }
    }

    public static function ensure_key() {
        if (get_option(self::KEY_OPTION, '') === '') {
            update_option(self::KEY_OPTION, wp_generate_password(48, false, false), false);
        }
    }

    private static function allowed_origins() {
        $raw = (string) get_option(self::ORIGINS_OPTION, 'https://mamadflat.github.io');
        $values = preg_split('/[\r\n,]+/', $raw);
        $origins = [];
        foreach ((array) $values as $value) {
            $value = trim($value);
            if ($value !== '' && preg_match('#^https?://[a-z0-9.-]+(?::\d+)?$#i', $value)) {
                $origins[] = untrailingslashit($value);
            }
        }
        return array_values(array_unique($origins));
    }

    private static function category_taxonomy() {
        return taxonomy_exists('product_cat') ? 'product_cat' : 'category';
    }

    private static function supported_content_types() {
        return ['post', 'page'];
    }

    private static function supported_content_statuses() {
        return ['publish', 'draft', 'pending', 'private', 'future'];
    }

    public static function allowed_cors_headers($headers) {
        $headers[] = 'X-Seokav-Key';
        return array_values(array_unique($headers));
    }

    public static function serve_cors($served, $result, $request, $server) {
        if (strpos($request->get_route(), '/' . self::NAMESPACE . '/') !== 0) {
            return $served;
        }
        $origin = get_http_origin();
        if ($origin && in_array(untrailingslashit($origin), self::allowed_origins(), true)) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
            header('Access-Control-Allow-Methods: OPTIONS, GET, POST, PUT, PATCH, DELETE');
            header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce, X-Seokav-Key');
            header('Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages');
            header('Vary: Origin', false);
        }
        return $served;
    }

    public static function admin_menu() {
        add_management_page(
            'اتصال سئوکاو',
            'اتصال سئوکاو',
            'manage_options',
            'seokav-connector',
            [__CLASS__, 'settings_page']
        );
    }

    public static function settings_page() {
        if (!current_user_can('manage_options')) return;
        self::ensure_key();
        $key = (string) get_option(self::KEY_OPTION, '');
        $origins = (string) get_option(self::ORIGINS_OPTION, 'https://mamadflat.github.io');
        ?>
        <div class="wrap" dir="rtl" style="max-width:780px">
            <h1>اتصال سئوکاو</h1>
            <?php if (isset($_GET['updated'])) : ?>
                <div class="notice notice-success is-dismissible"><p>تنظیمات اتصال ذخیره شد.</p></div>
            <?php endif; ?>
            <p>این کلید به داشبورد سئوکاو اجازه می‌دهد محصولات و دسته‌ها را با سطح دسترسی مدیر ووکامرس بخواند و ویرایش کند. آن را فقط در داشبورد خودت وارد کن.</p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="seokav_save_settings">
                <?php wp_nonce_field('seokav_save_settings'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="seokav-key">کلید اتصال</label></th>
                        <td>
                            <input id="seokav-key" class="regular-text code" type="text" readonly value="<?php echo esc_attr($key); ?>" onclick="this.select()">
                            <p class="description">کلید را کپی کن و در سئوکاو، بخش «تنظیمات و اتصال‌ها» قرار بده.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="seokav-origins">دامنه‌های مجاز داشبورد</label></th>
                        <td>
                            <textarea id="seokav-origins" name="origins" class="large-text code" rows="4"><?php echo esc_textarea($origins); ?></textarea>
                            <p class="description">هر Origin در یک خط؛ مقدار عمومی سئوکاو: <code>https://mamadflat.github.io</code></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">ساخت کلید تازه</th>
                        <td><label><input type="checkbox" name="rotate" value="1"> کلید قبلی باطل و کلید جدید ساخته شود</label></td>
                    </tr>
                </table>
                <?php submit_button('ذخیره تنظیمات'); ?>
            </form>
            <p><strong>هشدار:</strong> هر کسی که این کلید را داشته باشد می‌تواند محصولات را ویرایش کند. اگر کلید لو رفت، همین‌جا آن را تعویض کن.</p>
        </div>
        <?php
    }

    public static function save_settings() {
        if (!current_user_can('manage_options')) wp_die('دسترسی غیرمجاز.');
        check_admin_referer('seokav_save_settings');
        $raw = isset($_POST['origins']) ? wp_unslash($_POST['origins']) : '';
        $values = preg_split('/[\r\n,]+/', (string) $raw);
        $valid = [];
        foreach ((array) $values as $value) {
            $value = untrailingslashit(trim($value));
            if (preg_match('#^https?://[a-z0-9.-]+(?::\d+)?$#i', $value)) $valid[] = $value;
        }
        if (!$valid) $valid[] = 'https://mamadflat.github.io';
        update_option(self::ORIGINS_OPTION, implode("\n", array_unique($valid)), false);
        if (!empty($_POST['rotate'])) {
            update_option(self::KEY_OPTION, wp_generate_password(48, false, false), false);
        }
        wp_safe_redirect(add_query_arg(['page' => 'seokav-connector', 'updated' => '1'], admin_url('tools.php')));
        exit;
    }

    public static function register_routes() {
        register_rest_route(self::NAMESPACE, '/health', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [__CLASS__, 'health'],
            'permission_callback' => [__CLASS__, 'can_manage_seokav'],
        ]);

        register_rest_route(self::NAMESPACE, '/categories', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [__CLASS__, 'categories'],
            'permission_callback' => [__CLASS__, 'can_manage_seokav'],
        ]);

        register_rest_route(self::NAMESPACE, '/categories/(?P<id>\d+)', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [__CLASS__, 'category'],
                'permission_callback' => [__CLASS__, 'can_manage_seokav'],
            ],
            [
                'methods' => WP_REST_Server::EDITABLE,
                'callback' => [__CLASS__, 'update_category'],
                'permission_callback' => [__CLASS__, 'can_manage_seokav'],
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/products', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [__CLASS__, 'products'],
            'permission_callback' => [__CLASS__, 'can_manage_seokav'],
        ]);

        register_rest_route(self::NAMESPACE, '/products/(?P<id>\d+)', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [__CLASS__, 'product'],
                'permission_callback' => [__CLASS__, 'can_manage_seokav'],
            ],
            [
                'methods' => WP_REST_Server::EDITABLE,
                'callback' => [__CLASS__, 'update_product'],
                'permission_callback' => [__CLASS__, 'can_manage_seokav'],
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/content/(?P<type>[a-zA-Z0-9_-]+)/(?P<id>\d+)', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [__CLASS__, 'content'],
                'permission_callback' => [__CLASS__, 'can_edit_content'],
            ],
            [
                'methods' => WP_REST_Server::EDITABLE,
                'callback' => [__CLASS__, 'update_content'],
                'permission_callback' => [__CLASS__, 'can_edit_content'],
            ],
        ]);
    }

    private static function valid_connector_key(WP_REST_Request $request) {
        $given = (string) $request->get_header('x_seokav_key');
        $saved = (string) get_option(self::KEY_OPTION, '');
        return $given !== '' && $saved !== '' && hash_equals($saved, $given);
    }

    public static function can_manage_seokav(WP_REST_Request $request) {
        return current_user_can('manage_woocommerce') || current_user_can('manage_options') || self::valid_connector_key($request);
    }

    public static function can_edit_content(WP_REST_Request $request) {
        if (!in_array(sanitize_key($request['type']), self::supported_content_types(), true)) return false;
        return current_user_can('edit_post', absint($request['id'])) || self::valid_connector_key($request);
    }

    public static function health() {
        return rest_ensure_response([
            'ok' => true,
            'version' => self::VERSION,
            'wordpress_version' => get_bloginfo('version'),
            'woocommerce' => class_exists('WooCommerce') ? WC_VERSION : null,
            'site_url' => home_url('/'),
            'capabilities' => [
                'categories.read',
                'categories.write',
                'content.read',
                'content.write',
                class_exists('WooCommerce') ? 'products.read' : null,
                class_exists('WooCommerce') ? 'products.write' : null,
            ],
        ]);
    }

    private static function require_woocommerce() {
        if (!class_exists('WooCommerce') || !function_exists('wc_get_product')) {
            return new WP_Error('seokav_woocommerce_missing', 'ووکامرس فعال نیست.', ['status' => 409]);
        }
        return true;
    }

    private static function seo_meta($object_id, $taxonomy = '') {
        $reader = $taxonomy ? 'get_term_meta' : 'get_post_meta';
        $title = call_user_func($reader, $object_id, '_yoast_wpseo_title', true);
        $description = call_user_func($reader, $object_id, '_yoast_wpseo_metadesc', true);
        if ($title === '') {
            $title = call_user_func($reader, $object_id, 'rank_math_title', true);
        }
        if ($description === '') {
            $description = call_user_func($reader, $object_id, 'rank_math_description', true);
        }
        return ['seo_title' => (string) $title, 'seo_description' => (string) $description];
    }

    private static function update_seo_meta($object_id, WP_REST_Request $request, $taxonomy = '') {
        $writer = $taxonomy ? 'update_term_meta' : 'update_post_meta';
        if ($request->has_param('seo_title')) {
            $value = sanitize_text_field((string) $request->get_param('seo_title'));
            call_user_func($writer, $object_id, '_yoast_wpseo_title', $value);
            call_user_func($writer, $object_id, 'rank_math_title', $value);
        }
        if ($request->has_param('seo_description')) {
            $value = sanitize_textarea_field((string) $request->get_param('seo_description'));
            call_user_func($writer, $object_id, '_yoast_wpseo_metadesc', $value);
            call_user_func($writer, $object_id, 'rank_math_description', $value);
        }
    }

    private static function category_payload(WP_Term $term, $taxonomy = '') {
        return array_merge([
            'id' => $term->term_id,
            'name' => $term->name,
            'slug' => $term->slug,
            'description' => $term->description,
            'parent' => $term->parent,
            'count' => $term->count,
            'permalink' => get_term_link($term),
        ], self::seo_meta($term->term_id, $taxonomy));
    }

    public static function categories(WP_REST_Request $request) {
        $taxonomy = self::category_taxonomy();
        $terms = get_terms([
            'taxonomy' => $taxonomy,
            'hide_empty' => false,
            'number' => min(200, max(1, absint($request->get_param('per_page') ?: 100))),
            'offset' => max(0, (absint($request->get_param('page') ?: 1) - 1) * absint($request->get_param('per_page') ?: 100)),
        ]);
        if (is_wp_error($terms)) {
            return $terms;
        }
        return rest_ensure_response(['categories' => array_map(function ($term) use ($taxonomy) {
            return self::category_payload($term, $taxonomy);
        }, $terms)]);
    }

    public static function category(WP_REST_Request $request) {
        $taxonomy = self::category_taxonomy();
        $term = get_term(absint($request['id']), $taxonomy);
        if (!$term || is_wp_error($term)) {
            return new WP_Error('seokav_category_missing', 'دسته پیدا نشد.', ['status' => 404]);
        }
        return rest_ensure_response(self::category_payload($term, $taxonomy));
    }

    public static function update_category(WP_REST_Request $request) {
        $taxonomy = self::category_taxonomy();
        $id = absint($request['id']);
        $term = get_term($id, $taxonomy);
        if (!$term || is_wp_error($term)) {
            return new WP_Error('seokav_category_missing', 'دسته پیدا نشد.', ['status' => 404]);
        }
        $args = [];
        if ($request->has_param('name')) {
            $args['name'] = sanitize_text_field((string) $request->get_param('name'));
        }
        if ($request->has_param('slug')) {
            $args['slug'] = sanitize_title((string) $request->get_param('slug'));
        }
        if ($request->has_param('description')) {
            $args['description'] = wp_kses_post((string) $request->get_param('description'));
        }
        if ($request->has_param('parent')) {
            $parent = absint($request->get_param('parent'));
            if ($parent === $id) {
                return new WP_Error('seokav_invalid_parent', 'یک دسته نمی‌تواند والد خودش باشد.', ['status' => 400]);
            }
            $args['parent'] = $parent;
        }
        if ($args) {
            $result = wp_update_term($id, $taxonomy, $args);
            if (is_wp_error($result)) {
                return $result;
            }
        }
        self::update_seo_meta($id, $request, $taxonomy);
        clean_term_cache($id, $taxonomy);
        return self::category($request);
    }

    private static function product_payload(WC_Product $product) {
        $categories = array_map('absint', $product->get_category_ids());
        return array_merge([
            'id' => $product->get_id(),
            'type' => $product->get_type(),
            'name' => $product->get_name(),
            'slug' => $product->get_slug(),
            'status' => $product->get_status(),
            'sku' => $product->get_sku(),
            'regular_price' => $product->get_regular_price(),
            'sale_price' => $product->get_sale_price(),
            'stock_status' => $product->get_stock_status(),
            'stock_quantity' => $product->get_stock_quantity(),
            'short_description' => $product->get_short_description(),
            'description' => $product->get_description(),
            'categories' => $categories,
            'permalink' => $product->get_permalink(),
            'modified_at' => $product->get_date_modified() ? $product->get_date_modified()->date(DATE_ATOM) : null,
        ], self::seo_meta($product->get_id()));
    }

    private static function product_summary(WC_Product $product) {
        return [
            'id' => $product->get_id(),
            'type' => $product->get_type(),
            'name' => $product->get_name(),
            'slug' => $product->get_slug(),
            'status' => $product->get_status(),
            'sku' => $product->get_sku(),
            'regular_price' => $product->get_regular_price(),
            'sale_price' => $product->get_sale_price(),
            'stock_status' => $product->get_stock_status(),
            'stock_quantity' => $product->get_stock_quantity(),
            'categories' => array_map('absint', $product->get_category_ids()),
            'permalink' => $product->get_permalink(),
            'modified_at' => $product->get_date_modified() ? $product->get_date_modified()->date(DATE_ATOM) : null,
        ];
    }

    private static function product_statuses() {
        return ['publish', 'draft', 'pending', 'private', 'future', 'trash'];
    }

    public static function products(WP_REST_Request $request) {
        $ready = self::require_woocommerce();
        if (is_wp_error($ready)) {
            return $ready;
        }
        $page = max(1, absint($request->get_param('page') ?: 1));
        $per_page = min(100, max(1, absint($request->get_param('per_page') ?: 50)));
        $requested_status = sanitize_key((string) ($request->get_param('status') ?: 'any'));
        $statuses = self::product_statuses();
        if ($requested_status !== 'any' && !in_array($requested_status, $statuses, true)) {
            return new WP_Error('seokav_invalid_status', 'وضعیت محصول معتبر نیست.', ['status' => 400]);
        }
        $query = [
            'limit' => $per_page,
            'page' => $page,
            'paginate' => true,
            'status' => $requested_status === 'any' ? $statuses : [$requested_status],
            'orderby' => 'modified',
            'order' => 'DESC',
        ];
        $search = sanitize_text_field((string) $request->get_param('search'));
        if ($search !== '') {
            $query['s'] = $search;
        }
        $result = wc_get_products($query);
        $counts = wp_count_posts('product');
        $status_counts = [];
        foreach ($statuses as $status) $status_counts[$status] = isset($counts->$status) ? (int) $counts->$status : 0;
        return rest_ensure_response([
            'products' => array_map([__CLASS__, 'product_summary'], $result->products),
            'total' => $result->total,
            'max_pages' => $result->max_num_pages,
            'status_counts' => $status_counts,
        ]);
    }

    public static function product(WP_REST_Request $request) {
        $ready = self::require_woocommerce();
        if (is_wp_error($ready)) {
            return $ready;
        }
        $product = wc_get_product(absint($request['id']));
        if (!$product) {
            return new WP_Error('seokav_product_missing', 'محصول پیدا نشد.', ['status' => 404]);
        }
        return rest_ensure_response(self::product_payload($product));
    }

    public static function update_product(WP_REST_Request $request) {
        $ready = self::require_woocommerce();
        if (is_wp_error($ready)) {
            return $ready;
        }
        $product = wc_get_product(absint($request['id']));
        if (!$product) {
            return new WP_Error('seokav_product_missing', 'محصول پیدا نشد.', ['status' => 404]);
        }

        $commercial_fields = ['regular_price', 'sale_price', 'stock_status', 'stock_quantity'];
        foreach ($commercial_fields as $field) {
            if ($request->has_param($field) && $request->get_param('confirm_commercial_changes') !== true) {
                return new WP_Error('seokav_confirmation_required', 'تغییر قیمت یا موجودی به تأیید صریح نیاز دارد.', ['status' => 400]);
            }
        }

        if ($request->has_param('name')) $product->set_name(sanitize_text_field((string) $request->get_param('name')));
        if ($request->has_param('slug')) $product->set_slug(sanitize_title((string) $request->get_param('slug')));
        if ($request->has_param('status')) {
            $status = sanitize_key((string) $request->get_param('status'));
            if (!in_array($status, self::product_statuses(), true)) {
                return new WP_Error('seokav_invalid_status', 'وضعیت محصول معتبر نیست.', ['status' => 400]);
            }
            $product->set_status($status);
        }
        if ($request->has_param('sku')) $product->set_sku(wc_clean((string) $request->get_param('sku')));
        if ($request->has_param('description')) $product->set_description(wp_kses_post((string) $request->get_param('description')));
        if ($request->has_param('short_description')) $product->set_short_description(wp_kses_post((string) $request->get_param('short_description')));
        if ($request->has_param('regular_price')) $product->set_regular_price(wc_format_decimal($request->get_param('regular_price')));
        if ($request->has_param('sale_price')) $product->set_sale_price(wc_format_decimal($request->get_param('sale_price')));
        if ($request->has_param('stock_status')) $product->set_stock_status(wc_clean((string) $request->get_param('stock_status')));
        if ($request->has_param('stock_quantity')) {
            $product->set_manage_stock(true);
            $product->set_stock_quantity(wc_stock_amount($request->get_param('stock_quantity')));
        }
        if ($request->has_param('categories')) {
            $product->set_category_ids(array_map('absint', (array) $request->get_param('categories')));
        }
        $product->save();
        self::update_seo_meta($product->get_id(), $request);
        return rest_ensure_response(self::product_payload(wc_get_product($product->get_id())));
    }

    private static function content_payload(WP_Post $post) {
        return array_merge([
            'id' => $post->ID,
            'type' => $post->post_type,
            'title' => get_the_title($post),
            'slug' => $post->post_name,
            'status' => $post->post_status,
            'content' => $post->post_content,
            'excerpt' => $post->post_excerpt,
            'permalink' => get_permalink($post),
        ], self::seo_meta($post->ID));
    }

    public static function content(WP_REST_Request $request) {
        $type = sanitize_key($request['type']);
        $post = get_post(absint($request['id']));
        if (!in_array($type, self::supported_content_types(), true) || !$post || $post->post_type !== $type) {
            return new WP_Error('seokav_content_missing', 'محتوا پیدا نشد.', ['status' => 404]);
        }
        return rest_ensure_response(self::content_payload($post));
    }

    public static function update_content(WP_REST_Request $request) {
        $type = sanitize_key($request['type']);
        $post = get_post(absint($request['id']));
        if (!in_array($type, self::supported_content_types(), true) || !$post || $post->post_type !== $type) {
            return new WP_Error('seokav_content_missing', 'محتوا پیدا نشد.', ['status' => 404]);
        }
        $update = ['ID' => $post->ID];
        if ($request->has_param('title')) $update['post_title'] = sanitize_text_field((string) $request->get_param('title'));
        if ($request->has_param('slug')) $update['post_name'] = sanitize_title((string) $request->get_param('slug'));
        if ($request->has_param('status')) {
            $status = sanitize_key((string) $request->get_param('status'));
            if (!in_array($status, self::supported_content_statuses(), true)) {
                return new WP_Error('seokav_invalid_content_status', 'وضعیت محتوا معتبر نیست.', ['status' => 400]);
            }
            $update['post_status'] = $status;
        }
        if ($request->has_param('content')) $update['post_content'] = wp_kses_post((string) $request->get_param('content'));
        if ($request->has_param('excerpt')) $update['post_excerpt'] = wp_kses_post((string) $request->get_param('excerpt'));
        if (count($update) > 1) {
            $result = wp_update_post($update, true);
            if (is_wp_error($result)) return $result;
        }
        self::update_seo_meta($post->ID, $request);
        return rest_ensure_response(self::content_payload(get_post($post->ID)));
    }
}

register_activation_hook(__FILE__, ['Seokav_Connector', 'activate']);
Seokav_Connector::boot();
