## ── Stage 1: Builder ──────────────────────────────────────
FROM composer:2 AS builder

WORKDIR /build
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction --no-scripts

COPY . .
RUN composer dump-autoload --optimize --no-dev

## ── Stage 2: Runtime ─────────────────────────────────────
FROM php:8.3-fpm

# ── Dépendances système (runtime uniquement, pas git/unzip) ──
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    gosu \
    libpq5 \
    libzip4 \
    libicu72 \
    libpng16-16 \
    libjpeg62-turbo \
    libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

# ── Extensions PHP (nécessitent les *-dev pour la compilation) ──
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libzip-dev \
    libicu-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        exif \
        gd \
        intl \
        opcache \
        pcntl \
        pdo_pgsql \
        sockets \
        zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get purge -y --auto-remove libpq-dev libzip-dev libicu-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# ── PHP-FPM : écouter sur 127.0.0.1:9000 ──
RUN sed -i 's|^listen = .*|listen = 127.0.0.1:9000|' /usr/local/etc/php-fpm.d/www.conf \
    && sed -i 's|^;clear_env = .*|clear_env = no|' /usr/local/etc/php-fpm.d/www.conf

# ── OPcache production ──
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.max_accelerated_files=10000'; \
    echo 'opcache.validate_timestamps=0'; \
    } > /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /var/www/html

# ── Copier l'application depuis le builder ──
COPY --from=builder /build .

# ── Nginx vhost pour le container ──
COPY docker/nginx.conf /etc/nginx/sites-available/default

# NOTE: L'entrypoint tourne en root pour sed/migrate, mais PHP-FPM et Nginx
# servent les requêtes en tant que www-data via leur configuration respective.
RUN chmod +x /var/www/html/scripts/start-render.sh \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache /var/www/html/public

EXPOSE 10000

CMD ["/var/www/html/scripts/start-render.sh"]