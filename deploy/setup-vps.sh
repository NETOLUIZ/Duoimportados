#!/bin/bash
set -e

echo "🚀 Configurando duoimportados.com.br na VPS..."

# 1. Instalar Nginx e Certbot para SSL
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Copiar configuração do Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/duoimportados
sudo ln -sf /etc/nginx/sites-available/duoimportados /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 3. Gerar Certificado SSL Grátis (HTTPS)
sudo certbot --nginx -d duoimportados.com.br -d www.duoimportados.com.br --non-interactive --agree-tos -m admin@duoimportados.com.br || true

# 4. Garantir que as portas no SSL fiquem corretas (3088 frontend / 3011 backend)
sudo sed -i 's/3008/3088/g' /etc/nginx/sites-available/duoimportados
sudo sed -i 's/3001/3011/g' /etc/nginx/sites-available/duoimportados
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Domínio duoimportados.com.br configurado com sucesso!"
