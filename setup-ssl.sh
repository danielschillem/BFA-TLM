#!/bin/bash
set -e
echo 'Verification DNS...'
IP=$(dig +short liptako.bfa-tlm.online A)
if [ "$IP" != "167.172.180.160" ]; then
  echo "ERREUR: DNS ne pointe pas vers 167.172.180.160 (resolu: $IP)"
  echo "Changez les NS de bfa-tlm.online vers ns1/ns2/ns3.digitalocean.com"
  exit 1
fi
echo 'DNS OK - lancement Certbot...'
certbot --nginx -d liptako.bfa-tlm.online --non-interactive --agree-tos -m danielschillem@gmail.com --redirect
echo 'SSL active !'
systemctl reload nginx
