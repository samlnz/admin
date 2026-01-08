#!/bin/bash
# Deploy Real-time Bingo Game Server

set -e

echo "🎮 Deploying Real-time Bingo Game Server..."

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Create game server directory
GAME_DIR="/opt/bingo-game-server"
sudo mkdir -p $GAME_DIR
sudo chown -R $USER:$USER $GAME_DIR

# Copy game server files
echo "📁 Copying game server files..."
cp -r server/* $GAME_DIR/
cp package-game.json $GAME_DIR/package.json

# Install dependencies
echo "📦 Installing dependencies..."
cd $GAME_DIR
npm install

# Create systemd service
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/bingo-game-server.service > /dev/null <<EOF
[Unit]
Description=Bingo Game WebSocket Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$GAME_DIR
Environment=NODE_ENV=production
Environment=GAME_PORT=3001
ExecStart=/usr/bin/node game-server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable bingo-game-server.service
sudo systemctl start bingo-game-server.service

# Update Nginx configuration
echo "🌐 Updating Nginx configuration..."
sudo tee /etc/nginx/sites-available/bingo-game > /dev/null <<EOF
server {
    listen 3001;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/bingo-game /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Configure firewall
echo "🛡️ Configuring firewall..."
sudo ufw allow 3001/tcp

echo "✅ Game server deployment complete!"
echo ""
echo "📊 Services Status:"
sudo systemctl status bingo-game-server.service --no-pager
echo ""
echo "🎮 Game WebSocket: wss://your-domain.com:3001"
echo "🌐 Game URL: https://your-domain.com/game.html"
echo ""
echo "🔧 Test connection:"
echo "wscat -c ws://localhost:3001"