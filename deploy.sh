#!/bin/bash
set -e

cd "$(dirname "$0")"

DOMAIN="estore.amptechnology.in"
EMAIL="devs.amptechnology@gmail.com"
CONTAINER="estore-frontend"
APP_PORT="3061"
CERT_PATH="/root/amp_portal_backend/certbot/conf/live/$DOMAIN/fullchain.pem"
NGINX_CONF="/root/amp_portal_backend/nginx/conf.d/$DOMAIN.conf"
SHARED_NETWORK="amp_portal_backend_app-network"

echo "=== Starting deployment for $DOMAIN ==="

# ── Pre-flight checks ──
if [ ! -f .env ]; then
  echo "ERROR: .env file not found in $(pwd). Create it first."
  exit 1
fi

if ! docker network inspect "$SHARED_NETWORK" > /dev/null 2>&1; then
  echo "ERROR: network $SHARED_NETWORK not found."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "nginx"; then
  echo "ERROR: nginx container is not running."
  exit 1
fi

wait_for_network() {
  echo "Waiting for $CONTAINER to join $SHARED_NETWORK..."
  for i in $(seq 1 20); do
    if docker network inspect "$SHARED_NETWORK" 2>/dev/null | grep -q "$CONTAINER"; then
      echo "$CONTAINER is on the network!"
      return 0
    fi
    echo "  attempt $i/20 - not yet, waiting 2s..."
    sleep 2
  done
  echo "ERROR: $CONTAINER never joined $SHARED_NETWORK!"
  docker logs --tail 50 "$CONTAINER" || true
  exit 1
}

write_https_config() {
cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://$CONTAINER:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF
}

# ── CASE 1: Certificate already exists -> redeploy ──
if test -f "$CERT_PATH"; then
  echo "Certificate already exists - redeploying."

  git pull --ff-only || echo "git pull skipped"

  docker compose down || true
  docker compose pull
  docker compose up -d --remove-orphans

  wait_for_network

  write_https_config
  docker exec nginx nginx -t
  docker exec nginx nginx -s reload

  echo "=== Redeploy complete! https://$DOMAIN is live ==="
  exit 0
fi

# ── CASE 2: First time -> generate SSL certificate ──
echo "No certificate found - starting first-time SSL setup..."

cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
NGINXEOF

docker exec nginx nginx -t
docker exec nginx nginx -s reload
sleep 3

curl -sf -H "Host: $DOMAIN" http://localhost:80 > /dev/null \
  && echo "port 80 OK" \
  || { echo "ERROR: port 80 not responding"; exit 1; }

echo "Requesting certificate from Let's Encrypt..."
docker run --rm \
  --network "$SHARED_NETWORK" \
  -v "/root/amp_portal_backend/certbot/www:/var/www/certbot" \
  -v "/root/amp_portal_backend/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

chown -R root:root /root/amp_portal_backend/certbot
chmod -R 755 /root/amp_portal_backend/certbot

if ! test -f "$CERT_PATH"; then
  echo "ERROR: Certificate not found at $CERT_PATH after certbot run!"
  exit 1
fi

echo "Certificate obtained successfully!"

# App age start, jate nginx upstream resolve kore
docker compose down || true
docker compose pull
docker compose up -d --remove-orphans

wait_for_network

write_https_config
docker exec nginx nginx -t
docker exec nginx nginx -s reload

echo "=== SSL setup complete! https://$DOMAIN is now live! ==="