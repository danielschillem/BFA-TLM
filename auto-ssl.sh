#!/bin/bash
# Auto-SSL checker — runs every 5 min via cron until DNS propagates and SSL is installed
set -e
DOMAIN="liptako.bfa-tlm.online"
EXPECTED_IP="167.172.180.160"
LOGFILE="/var/log/auto-ssl.log"

IP=$(dig +short "$DOMAIN" A 2>/dev/null | head -1)

if [ "$IP" != "$EXPECTED_IP" ]; then
  echo "$(date): DNS not ready yet (resolved: $IP, expected: $EXPECTED_IP)" >> "$LOGFILE"
  exit 0
fi

# DNS is ready — check if SSL already installed
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "$(date): SSL already installed, removing cron" >> "$LOGFILE"
  rm -f /etc/cron.d/auto-ssl
  exit 0
fi

echo "$(date): DNS OK! Installing SSL..." >> "$LOGFILE"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m danielschillem@gmail.com --redirect >> "$LOGFILE" 2>&1

if [ $? -eq 0 ]; then
  echo "$(date): SSL installed successfully!" >> "$LOGFILE"
  systemctl reload nginx
  # Update .env to use https
  sed -i 's|APP_URL=http://|APP_URL=https://|' /var/www/liptakocare/Backend/.env
  sed -i 's|FRONTEND_URL=http://|FRONTEND_URL=https://|' /var/www/liptakocare/Backend/.env
  cd /var/www/liptakocare/Backend && php artisan config:clear && php artisan optimize
  # Remove this cron job
  rm -f /etc/cron.d/auto-ssl
  echo "$(date): All done. Platform live at https://$DOMAIN" >> "$LOGFILE"
else
  echo "$(date): Certbot failed, will retry in 5 min" >> "$LOGFILE"
fi
