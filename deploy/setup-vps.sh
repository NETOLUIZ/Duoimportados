#!/bin/bash
set -e

echo "🚀 Configurando duoimportados.com.br e subdomínios coringa (*.duoimportados.com.br) na VPS..."

# 1. Instalar Nginx e Certbot para SSL
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Copiar configuração do Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/duoimportados
sudo ln -sf /etc/nginx/sites-available/duoimportados /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 3. Garantir portas corretas no Nginx (3098 frontend / 3095 backend)
sudo sed -i 's/3008/3098/g' /etc/nginx/sites-available/duoimportados
sudo sed -i 's/3088/3098/g' /etc/nginx/sites-available/duoimportados
sudo sed -i 's/3001/3095/g' /etc/nginx/sites-available/duoimportados
sudo sed -i 's/3011/3095/g' /etc/nginx/sites-available/duoimportados
sudo nginx -t
sudo systemctl reload nginx

# 4. Gerar Certificado SSL (HTTPS)
# NOTA: Para obter SSL Wildcard (*.duoimportados.com.br) via Let's Encrypt diretamente na VPS,
# é necessária validação DNS-01 (TXT record). Caso use Cloudflare como DNS Proxy, o SSL é automático na borda.
sudo certbot --nginx -d duoimportados.com.br -d www.duoimportados.com.br --non-interactive --agree-tos -m admin@duoimportados.com.br || true

echo "✅ Servidor Nginx preparado para Wildcard DNS (*.duoimportados.com.br) com sucesso!"

