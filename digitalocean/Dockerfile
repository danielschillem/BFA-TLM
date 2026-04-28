## ── Stage 1: Build Frontend ───────────────────────────────
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS frontend-builder

ARG USE_PREBUILT_FRONTEND=0

WORKDIR /build-frontend
COPY Frontend/package.json Frontend/package-lock.json ./
RUN if [ "$USE_PREBUILT_FRONTEND" = "1" ]; then \
      echo "Skipping npm ci (desktop: use host-built Frontend/dist)"; \
    else \
      npm ci --no-audit --no-fund; \
    fi

COPY Frontend/ .
# Build en mode production.digitalocean (ou dist déjà produit sur l’hôte)
RUN if [ "$USE_PREBUILT_FRONTEND" = "1" ]; then \
      test -f dist/index.html || (echo "Frontend/dist manquant : lancer sur l’hôte node scripts/generate-runtime-config.mjs production.digitalocean && npx vite build --mode production.digitalocean" && exit 1); \
    else \
      node scripts/generate-runtime-config.mjs production.digitalocean \
      && npx vite build --mode production.digitalocean; \
    fi

## ── Stage 2: Build Backend (Composer) ────────────────────
FROM composer:2@sha256:dc292c5c0f95f526b051d4c341bf08e7e2b18504c74625e3203d7f123050e318 AS backend-builder

ARG USE_LOCAL_PHP_VENDOR=0

WORKDIR /build-backend
COPY Backend/composer.json Backend/composer.lock ./
RUN if [ "$USE_LOCAL_PHP_VENDOR" = "1" ]; then \
      echo "Skipping composer install (host vendor copied with Backend/)"; \
    else \
      composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction --no-scripts; \
    fi

COPY Backend/ .
# .dockerignore exclut bootstrap/cache : le recréer pour package:discover (post-autoload-dump).
RUN mkdir -p bootstrap/cache storage/framework/cache storage/framework/sessions storage/framework/views storage/logs \
    && composer dump-autoload --optimize --no-dev

## ── Stage 3: Runtime ─────────────────────────────────────
FROM php:8.4-fpm

# ── Dépendances système + Extensions PHP ──
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    gosu \
    supervisor \
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

# ── PHP limits ──
RUN { \
    echo 'upload_max_filesize=50M'; \
    echo 'post_max_size=55M'; \
    echo 'memory_limit=256M'; \
    echo 'max_execution_time=120'; \
    } > /usr/local/etc/php/conf.d/limits.ini

# ── Copier le backend ──
WORKDIR /var/www/html/backend
COPY --from=backend-builder /build-backend .

# ── Copier le frontend buildé ──
COPY --from=frontend-builder /build-frontend/dist /var/www/html/frontend

# ── Nginx config unifiée ──
COPY digitalocean/nginx.conf /etc/nginx/sites-available/default
RUN rm -f /etc/nginx/sites-enabled/default \
    && ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# ── Supervisor pour PHP-FPM + Nginx + Reverb (optionnel) ──
COPY digitalocean/supervisord.conf /etc/supervisor/conf.d/bfa-tlm.conf

# ── Entrypoint ──
COPY digitalocean/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# ── Permissions ──
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache /var/www/html/frontend

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
