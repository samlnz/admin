// Real-time WebSocket Client
class RealTimeClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.eventHandlers = new Map();
        this.gameState = null;
        this.playerId = null;
        
        this.connect();
    }
    
    connect() {
        try {
            // Auto-detect server URL
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname || 'localhost';
            const port = window.location.port || 3000;
            const serverUrl = `${protocol}//${host}:${port}`;
            
            console.log(`🔄 Connecting to WebSocket: ${serverUrl}`);
            
            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 20000
            });
            
            this.setupEventListeners();
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.scheduleReconnection();
        }
    }
    
    setupEventListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('✅ Connected to real-time server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.triggerEvent('connected');
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log(`❌ Disconnected: ${reason}`);
            this.isConnected = false;
            this.triggerEvent('disconnected', { reason });
            
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, try to reconnect
                this.socket.connect();
            }
        });
        
        // Game events
        this.socket.on('game-state', (state) => {
            console.log('📊 Received game state:', state.phase);
            this.gameState = state;
            this.triggerEvent('game-state', state);
        });
        
        this.socket.on('registration-confirmed', (data) => {
            this.playerId = data.playerId;
            this.triggerEvent('registration-confirmed', data);
        });
        
        this.socket.on('selection-countdown', (data) => {
            this.triggerEvent('selection-countdown', data);
        });
        
        this.socket.on('game-phase', (data) => {
            this.triggerEvent('game-phase', data);
        });
        
        this.socket.on('ready-countdown', (seconds) => {
            this.triggerEvent('ready-countdown', seconds);
        });
        
        this.socket.on('number-called', (numberData) => {
            this.triggerEvent('number-called', numberData);
        });
        
        this.socket.on('card-selected', (data) => {
            this.triggerEvent('card-selected', data);
        });
        
        this.socket.on('card-taken', (data) => {
            this.triggerEvent('card-taken', data);
        });
        
        this.socket.on('card-released', (data) => {
            this.triggerEvent('card-released', data);
        });
        
        this.socket.on('card-unavailable', (data) => {
            this.triggerEvent('card-unavailable', data);
        });
        
        this.socket.on('players-updated', (data) => {
            this.triggerEvent('players-updated', data);
        });
        
        this.socket.on('winner-declared', (winner) => {
            this.triggerEvent('winner-declared', winner);
        });
        
        this.socket.on('win-rejected', (data) => {
            this.triggerEvent('win-rejected', data);
        });
        
        // Ping/pong for connection health
        this.socket.on('pong', (data) => {
            this.triggerEvent('pong', data);
        });
    }
    
    // Register player
    registerPlayer(playerName, playerId) {
        if (!this.isConnected) {
            console.warn('Not connected to server');
            return false;
        }
        
        this.socket.emit('register-player', {
            playerId: playerId,
            playerName: playerName,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    // Select card
    selectCard(cardNumber) {
        if (!this.isConnected) {
            console.warn('Not connected to server');
            return false;
        }
        
        this.socket.emit('select-card', {
            cardNumber: cardNumber,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    // Deselect card
    deselectCard(cardNumber) {
        if (!this.isConnected) return false;
        
        this.socket.emit('deselect-card', {
            cardNumber: cardNumber,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    // Claim win
    claimWin(cardNumber, pattern) {
        if (!this.isConnected) return false;
        
        this.socket.emit('claim-win', {
            cardNumber: cardNumber,
            pattern: pattern,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    // Event management
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    triggerEvent(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error);
                }
            });
        }
    }
    
    scheduleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectAttempts * 2000;
        
        console.log(`⏳ Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        this.reconnectInterval = setTimeout(() => {
            this.connect();
        }, delay);
    }
    
    disconnect() {
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
        }
        
        if (this.socket) {
            this.socket.disconnect();
        }
    }
    
    getConnectionStatus() {
        return this.isConnected;
    }
    
    getGameState() {
        return this.gameState;
    }
    
    getPlayerId() {
        return this.playerId;
    }
}

// Create global instance
const realTimeClient = new RealTimeClient();