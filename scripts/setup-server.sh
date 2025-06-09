#!/bin/bash

# Script de configuración inicial para servidor Lightsail
# Ejecutar como: bash setup-server.sh

echo "🚀 Configurando servidor para Billeo..."

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar Git
sudo apt install git -y

# Crear directorio para la aplicación
mkdir -p /home/ubuntu/billeo-app
cd /home/ubuntu/billeo-app

# Configurar firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Instalar Certbot para SSL
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

echo "✅ Servidor configurado correctamente!"
echo "📋 Próximos pasos:"
echo "1. Clona tu repositorio: git clone https://github.com/TU_USUARIO/TU_REPO.git ."
echo "2. Configura las variables de entorno"
echo "3. Ejecuta: docker-compose up -d"
echo "4. Configura SSL: sudo certbot --nginx -d app.billeo.es" 