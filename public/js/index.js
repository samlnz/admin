// ============================================
// INDEX.JS - Main Game Controller
// ============================================

class BingoGameController {
    constructor() {
        // Game state
        this.gameState = {
            phase: 'lobby', // lobby, selection, ready, playing, ended
            playerId: null,
            playerName: 'Player',
            balance: 0,
            selectedCards: [],
            gameId: null,
            connectionStatus: 'disconnected',
            audioEnabled: true
        };
        
        // Initialize managers
        this.socketManager = null;
        this.uiManager = null;
        this.audioManager = null;
        this.cardManager = null;
        
        this.init();
    }

    async init() {
        console.log('🎮 Initializing Bingo Game Controller...');
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.gameState.gameId = urlParams.get('gameId') || 'BINGO_' + Date.now();
        
        // Initialize Telegram Web App
        await this.initTelegram();
        
        // Initialize managers
        this.initManagers();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update UI
        this.updateUI();
        
        console.log('✅ Game controller initialized');
    }

    async initTelegram() {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Expand to full screen
            tg.expand();
            tg.enableClosingConfirmation();
            
            // Get user data
            if (tg.initDataUnsafe?.user) {
                const user = tg.initDataUnsafe.user;
                this.gameState.playerId = user.id.toString();
                this.gameState.playerName = user.first_name || 'Telegram User';
                if (user.last_name) {
                    this.gameState.playerName += ' ' + user.last_name;
                }
            }
            
            // Set theme
            this.applyTelegramTheme(tg);
            
            console.log('🤖 Telegram Web App initialized');
        } else {
            // Generate random ID for testing
            this.gameState.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
            this.gameState.playerName = localStorage.getItem('playerName') || 'Player';
        }
    }

    applyTelegramTheme(tg) {
        const theme = tg.colorScheme;
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.style.setProperty('--bg-primary', '#0f2027');
            root.style.setProperty('--text-primary', '#ffffff');
        } else {
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--text-primary', '#000000');
        }
    }

    initManagers() {
        // Initialize Socket Manager
        this.socketManager = new SocketManager({
            gameId: this.gameState.gameId,
            playerId: this.gameState.playerId,
            playerName: this.gameState.playerName,
            onConnected: () => this.onSocketConnected(),
            onDisconnected: () => this.onSocketDisconnected(),
            onGameState: (state) => this.onGameStateUpdate(state),
            onNumberCalled: (data) => this.onNumberCalled(data),
            onPlayerJoined: (data) => this.onPlayerJoined(data),
            onWinner: (data) => this.onWinner(data)
        });
        
        // Initialize UI Manager
        this.uiManager = new UIManager();
        
        // Initialize Audio Manager
        this.audioManager = new AudioManager();
        this.audioManager.setEnabled(this.gameState.audioEnabled);
        
        // Initialize Card Manager
        this.cardManager = new CardManager();
    }

    setupEventListeners() {
        // Start game button
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }
        
        // Audio toggle
        const audioToggle = document.getElementById('audioToggle');
        if (audioToggle) {
            audioToggle.addEventListener('click', () => this.toggleAudio());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    this.toggleAudio();
                    break;
                case 'Enter':
                    if (this.gameState.phase === 'lobby') {
                        this.startGame();
                    }
                    break;
            }
        });
        
        // Page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPageHidden();
            } else {
                this.onPageVisible();
            }
        });
        
        // Before unload
        window.addEventListener('beforeunload', (e) => {
            if (this.socketManager && this.socketManager.isConnected()) {
                // Notify server about leaving
                this.socketManager.send({
                    type: 'player_leaving',
                    playerId: this.gameState.playerId
                });
            }
        });
    }

    startGame() {
        console.log('🚀 Starting game...');
        
        // Update UI to show loading
        this.uiManager.showLoading('Connecting to game server...');
        
        // Connect to game server
        this.socketManager.connect();
        
        // Update game state
        this.gameState.phase = 'connecting';
        this.updateUI();
    }

    onSocketConnected() {
        console.log('✅ Connected to game server');
        
        this.gameState.connectionStatus = 'connected';
        this.updateUI();
        
        // Join the game
        this.socketManager.joinGame();
        
        // Hide loading
        this.uiManager.hideLoading();
        
        // Navigate to card selection
        setTimeout(() => {
            window.location.href = 'choose-cards.html' + 
                `?gameId=${this.gameState.gameId}` +
                `&playerId=${this.gameState.playerId}` +
                `&playerName=${encodeURIComponent(this.gameState.playerName)}`;
        }, 1000);
    }

    onSocketDisconnected() {
        console.log('❌ Disconnected from game server');
        
        this.gameState.connectionStatus = 'disconnected';
        this.updateUI();
        
        // Show reconnection UI
        this.uiManager.showReconnectionMessage();
    }

    onGameStateUpdate(state) {
        console.log('📊 Game state update:', state);
        
        // Update local state
        Object.assign(this.gameState, state);
        this.updateUI();
        
        // Update UI manager
        this.uiManager.updateGameState(state);
    }

    onNumberCalled(data) {
        console.log('🔔 Number called:', data);
        
        // Update UI
        this.uiManager.showNumberCalled(data);
        
        // Play sound
        if (this.gameState.audioEnabled) {
            this.audioManager.playNumberCall();
        }
        
        // Auto-mark if enabled
        if (this.cardManager && this.cardManager.autoMarkEnabled) {
            this.cardManager.markNumber(data.number);
        }
    }

    onPlayerJoined(data) {
        console.log('👤 Player joined:', data.playerName);
        
        // Update player count
        this.uiManager.updatePlayerCount(data.playerCount);
        
        // Show notification
        this.uiManager.showNotification(`${data.playerName} joined the game`);
    }

    onWinner(data) {
        console.log('🏆 Winner declared:', data.playerName);
        
        // Stop all game activities
        this.gameState.phase = 'ended';
        
        // Show winner screen
        this.uiManager.showWinner(data);
        
        // Play win sound
        if (this.gameState.audioEnabled) {
            this.audioManager.playWinSound();
        }
        
        // Redirect to winner page after delay
        setTimeout(() => {
            window.location.href = 'winner.html' +
                `?winner=${encodeURIComponent(data.playerName)}` +
                `&card=${data.cardId}` +
                `&pattern=${data.pattern}`;
        }, 5000);
    }

    toggleAudio() {
        this.gameState.audioEnabled = !this.gameState.audioEnabled;
        this.audioManager.setEnabled(this.gameState.audioEnabled);
        
        // Update UI
        const audioToggle = document.getElementById('audioToggle');
        if (audioToggle) {
            const icon = audioToggle.querySelector('i');
            icon.className = this.gameState.audioEnabled ? 
                'fas fa-volume-up' : 'fas fa-volume-mute';
        }
    }

    onPageHidden() {
        console.log('📱 Page hidden');
        
        // Pause audio
        this.audioManager.pauseBackground();
        
        // Notify server about inactivity
        if (this.socketManager && this.socketManager.isConnected()) {
            this.socketManager.send({
                type: 'player_inactive',
                playerId: this.gameState.playerId
            });
        }
    }

    onPageVisible() {
        console.log('📱 Page visible');
        
        // Resume audio if enabled
        if (this.gameState.audioEnabled) {
            this.audioManager.resumeBackground();
        }
        
        // Notify server about activity
        if (this.socketManager && this.socketManager.isConnected()) {
            this.socketManager.send({
                type: 'player_active',
                playerId: this.gameState.playerId
            });
        }
    }

    updateUI() {
        // Update connection status
        const statusElement = document.getElementById('connectionStatus');
        const statusText = document.getElementById('connectionText');
        
        if (statusElement && statusText) {
            switch (this.gameState.connectionStatus) {
                case 'connected':
                    statusElement.className = 'status-dot connected';
                    statusText.textContent = 'Connected';
                    break;
                case 'connecting':
                    statusElement.className = 'status-dot connecting';
                    statusText.textContent = 'Connecting...';
                    break;
                default:
                    statusElement.className = 'status-dot disconnected';
                    statusText.textContent = 'Disconnected';
            }
        }
        
        // Update player count
        const playerCountElement = document.getElementById('currentPlayers');
        if (playerCountElement && this.gameState.players) {
            playerCountElement.textContent = this.gameState.players.length || 0;
        }
        
        // Update game phase
        const gamePhaseElement = document.getElementById('gamePhase');
        if (gamePhaseElement) {
            gamePhaseElement.textContent = this.gameState.phase.toUpperCase();
        }
        
        // Update next game timer
        if (this.gameState.nextGameTime) {
            const nextGameElement = document.getElementById('nextGame');
            if (nextGameElement) {
                const seconds = Math.max(0, Math.floor((this.gameState.nextGameTime - Date.now()) / 1000));
                nextGameElement.textContent = `${seconds}s`;
            }
        }
    }

    // Public API
    getGameState() {
        return { ...this.gameState };
    }

    setPlayerName(name) {
        this.gameState.playerName = name;
        localStorage.setItem('playerName', name);
        this.updateUI();
    }

    setBalance(balance) {
        this.gameState.balance = balance;
        this.updateUI();
    }

    selectCard(cardNumber) {
        if (!this.cardManager) return false;
        
        const success = this.cardManager.selectCard(cardNumber);
        if (success) {
            this.gameState.selectedCards = this.cardManager.getSelectedCards();
            
            // Notify server
            if (this.socketManager && this.socketManager.isConnected()) {
                this.socketManager.send({
                    type: 'card_selected',
                    playerId: this.gameState.playerId,
                    cardNumber: cardNumber
                });
            }
            
            this.updateUI();
            return true;
        }
        
        return false;
    }

    deselectCard(cardNumber) {
        if (!this.cardManager) return false;
        
        const success = this.cardManager.deselectCard(cardNumber);
        if (success) {
            this.gameState.selectedCards = this.cardManager.getSelectedCards();
            this.updateUI();
            return true;
        }
        
        return false;
    }

    claimBingo() {
        if (!this.cardManager || this.gameState.phase !== 'playing') {
            return false;
        }
        
        const bingoData = this.cardManager.checkBingo();
        if (bingoData.isBingo) {
            // Notify server
            if (this.socketManager && this.socketManager.isConnected()) {
                this.socketManager.send({
                    type: 'claim_bingo',
                    playerId: this.gameState.playerId,
                    cardId: bingoData.cardId,
                    pattern: bingoData.pattern,
                    markedNumbers: bingoData.markedNumbers
                });
            }
            
            return true;
        }
        
        return false;
    }
}

// ============================================
// SOCKET MANAGER
// ============================================

class SocketManager {
    constructor(options = {}) {
        this.options = {
            serverUrl: window.location.hostname === 'localhost' ? 
                'ws://localhost:3001' : 
                `wss://${window.location.hostname}:3001`,
            reconnectAttempts: 5,
            reconnectDelay: 1000,
            pingInterval: 30000,
            ...options
        };
        
        this.socket = null;
        this.reconnectCount = 0;
        this.pingInterval = null;
        
        // Callbacks
        this.onConnected = options.onConnected || (() => {});
        this.onDisconnected = options.onDisconnected || (() => {});
        this.onGameState = options.onGameState || (() => {});
        this.onNumberCalled = options.onNumberCalled || (() => {});
        this.onPlayerJoined = options.onPlayerJoined || (() => {});
        this.onWinner = options.onWinner || (() => {});
    }

    connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log('Socket already connected');
            return;
        }
        
        console.log(`Connecting to ${this.options.serverUrl}...`);
        
        try {
            this.socket = new WebSocket(this.options.serverUrl);
            
            this.socket.onopen = () => {
                console.log('✅ WebSocket connection established');
                this.reconnectCount = 0;
                this.startPingInterval();
                this.onConnected();
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
            
            this.socket.onclose = (event) => {
                console.log('WebSocket connection closed:', event.code, event.reason);
                this.stopPingInterval();
                this.onDisconnected();
                
                // Attempt reconnect
                if (this.reconnectCount < this.options.reconnectAttempts) {
                    setTimeout(() => {
                        this.reconnectCount++;
                        console.log(`Reconnecting (attempt ${this.reconnectCount})...`);
                        this.connect();
                    }, this.options.reconnectDelay * this.reconnectCount);
                }
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.onDisconnected();
        }
    }

    handleMessage(message) {
        const { type, data } = message;
        
        switch (type) {
            case 'welcome':
                console.log('Server welcome:', data);
                break;
                
            case 'game_state':
                this.onGameState(data);
                break;
                
            case 'number_called':
                this.onNumberCalled(data);
                break;
                
            case 'player_joined':
                this.onPlayerJoined(data);
                break;
                
            case 'player_left':
                console.log('Player left:', data);
                break;
                
            case 'winner':
                this.onWinner(data);
                break;
                
            case 'error':
                console.error('Server error:', data);
                break;
                
            case 'pong':
                // Ping response
                break;
                
            default:
                console.warn('Unknown message type:', type);
        }
    }

    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
            return true;
        } else {
            console.warn('Cannot send message: WebSocket not connected');
            return false;
        }
    }

    joinGame() {
        this.send({
            type: 'join',
            data: {
                gameId: this.options.gameId,
                playerId: this.options.playerId,
                playerName: this.options.playerName
            }
        });
    }

    startPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send({ type: 'ping' });
            }
        }, this.options.pingInterval);
    }

    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    isConnected() {
        return this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.stopPingInterval();
    }
}

// ============================================
// UI MANAGER
// ============================================

class UIManager {
    constructor() {
        this.notificationTimeout = null;
    }

    showLoading(message = 'Loading...') {
        // Create or get loading overlay
        let overlay = document.getElementById('loadingOverlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-message">${message}</div>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            const messageElement = overlay.querySelector('.loading-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
        
        overlay.style.display = 'flex';
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Clear existing notification
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            </div>
            <div class="notification-message">${message}</div>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Show with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after duration
        this.notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    showNumberCalled(data) {
        // Create number call overlay
        const overlay = document.createElement('div');
        overlay.className = 'number-call-overlay';
        overlay.innerHTML = `
            <div class="number-call-container">
                <div class="number-letter">${data.letter}</div>
                <div class="number-value">${data.number}</div>
                <div class="number-full">${data.full}</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Animate
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);
        
        // Remove after animation
        setTimeout(() => {
            overlay.classList.remove('show');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 500);
        }, 2000);
    }

    updatePlayerCount(count) {
        const elements = document.querySelectorAll('.player-count, #playerCount, #activePlayers');
        elements.forEach(el => {
            if (el) el.textContent = count;
        });
    }

    updateGameState(state) {
        // Update phase indicator
        const phaseElement = document.getElementById('gamePhase');
        if (phaseElement && state.phase) {
            phaseElement.textContent = state.phase.toUpperCase();
            phaseElement.className = `phase-${state.phase}`;
        }
        
        // Update timer
        if (state.selectionTimeLeft !== undefined) {
            const timerElement = document.getElementById('selectionTimer');
            if (timerElement) {
                const minutes = Math.floor(state.selectionTimeLeft / 60);
                const seconds = state.selectionTimeLeft % 60;
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                // Add warning class when time is low
                if (state.selectionTimeLeft <= 10) {
                    timerElement.classList.add('warning');
                } else {
                    timerElement.classList.remove('warning');
                }
            }
        }
        
        // Update game time
        if (state.gameTime !== undefined) {
            const timeElement = document.getElementById('gameTime');
            if (timeElement) {
                const minutes = Math.floor(state.gameTime / 60);
                const seconds = state.gameTime % 60;
                timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }
        
        // Update called numbers
        if (state.calledNumbers && state.calledNumbers.length > 0) {
            this.updateCalledNumbers(state.calledNumbers);
        }
    }

    updateCalledNumbers(numbers) {
        const container = document.getElementById('calledNumbers');
        if (!container) return;
        
        // Show last 10 numbers
        const recentNumbers = numbers.slice(-10);
        container.innerHTML = recentNumbers.map(num => `
            <span class="called-number">${num}</span>
        `).join('');
    }

    showWinner(data) {
        // Create winner overlay
        const overlay = document.createElement('div');
        overlay.className = 'winner-overlay';
        overlay.innerHTML = `
            <div class="winner-container">
                <div class="winner-trophy">
                    <i class="fas fa-trophy"></i>
                </div>
                <h1 class="winner-title">BINGO WINNER!</h1>
                <div class="winner-name">${data.playerName}</div>
                <div class="winner-details">
                    <div class="detail-item">
                        <span class="label">Card:</span>
                        <span class="value">#${data.cardId}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Pattern:</span>
                        <span class="value">${data.pattern}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Time:</span>
                        <span class="value">${data.gameDuration}s</span>
                    </div>
                </div>
                <button class="btn-play-again" id="btnPlayAgain">
                    Play Again
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add event listener
        setTimeout(() => {
            const playAgainBtn = document.getElementById('btnPlayAgain');
            if (playAgainBtn) {
                playAgainBtn.addEventListener('click', () => {
                    window.location.href = 'index.html';
                });
            }
        }, 100);
    }

    showReconnectionMessage() {
        this.showNotification('Connection lost. Attempting to reconnect...', 'warning', 5000);
    }
}

// ============================================
// AUDIO MANAGER
// ============================================

class AudioManager {
    constructor() {
        this.audioElements = {};
        this.enabled = true;
        this.backgroundVolume = 0.3;
        this.effectsVolume = 0.7;
        
        this.init();
    }

    init() {
        // Preload audio files
        this.loadAudio('background', '/audio/background.mp3', true);
        this.loadAudio('numberCall', '/audio/number-call.mp3');
        this.loadAudio('bingo', '/audio/bingo-win.mp3');
        this.loadAudio('click', '/audio/click.mp3');
        
        // Set volumes
        this.setVolumes();
    }

    loadAudio(id, src, loop = false) {
        const audio = new Audio();
        audio.src = src;
        audio.loop = loop;
        audio.preload = 'auto';
        
        this.audioElements[id] = audio;
    }

    setVolumes() {
        for (const [id, audio] of Object.entries(this.audioElements)) {
            if (id === 'background') {
                audio.volume = this.backgroundVolume;
            } else {
                audio.volume = this.effectsVolume;
            }
        }
    }

    play(id) {
        if (!this.enabled || !this.audioElements[id]) return;
        
        const audio = this.audioElements[id];
        audio.currentTime = 0;
        audio.play().catch(e => {
            console.log(`Failed to play audio ${id}:`, e);
        });
    }

    playBackground() {
        if (!this.enabled || !this.audioElements.background) return;
        
        const audio = this.audioElements.background;
        audio.play().catch(e => {
            console.log('Failed to play background music:', e);
        });
    }

    pauseBackground() {
        if (this.audioElements.background) {
            this.audioElements.background.pause();
        }
    }

    resumeBackground() {
        if (this.enabled && this.audioElements.background) {
            this.audioElements.background.play().catch(e => {
                console.log('Failed to resume background music:', e);
            });
        }
    }

    playNumberCall() {
        this.play('numberCall');
    }

    playWinSound() {
        this.play('bingo');
    }

    playClick() {
        this.play('click');
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled) {
            this.pauseBackground();
        } else {
            this.resumeBackground();
        }
    }

    setBackgroundVolume(volume) {
        this.backgroundVolume = Math.max(0, Math.min(1, volume));
        if (this.audioElements.background) {
            this.audioElements.background.volume = this.backgroundVolume;
        }
    }

    setEffectsVolume(volume) {
        this.effectsVolume = Math.max(0, Math.min(1, volume));
        this.setVolumes();
    }
}

// ============================================
// CARD MANAGER
// ============================================

class CardManager {
    constructor() {
        this.selectedCards = [];
        this.maxCards = 2;
        this.autoMarkEnabled = true;
        this.markedNumbers = {
            card1: [],
            card2: []
        };
        
        // Card generator
        this.cardGenerator = new CardGenerator();
    }

    selectCard(cardNumber) {
        // Check if already selected
        if (this.selectedCards.includes(cardNumber)) {
            this.deselectCard(cardNumber);
            return true;
        }
        
        // Check max cards
        if (this.selectedCards.length >= this.maxCards) {
            console.warn(`Maximum ${this.maxCards} cards allowed`);
            return false;
        }
        
        // Add card
        this.selectedCards.push(cardNumber);
        console.log(`Selected card #${cardNumber}`);
        
        return true;
    }

    deselectCard(cardNumber) {
        const index = this.selectedCards.indexOf(cardNumber);
        if (index > -1) {
            this.selectedCards.splice(index, 1);
            console.log(`Deselected card #${cardNumber}`);
            return true;
        }
        return false;
    }

    markNumber(number, cardIndex = null) {
        if (cardIndex !== null) {
            // Mark specific card
            const cardKey = `card${cardIndex + 1}`;
            if (!this.markedNumbers[cardKey].includes(number)) {
                this.markedNumbers[cardKey].push(number);
                return true;
            }
        } else {
            // Mark all selected cards
            let marked = false;
            this.selectedCards.forEach((cardNumber, index) => {
                const cardKey = `card${index + 1}`;
                const cardNumbers = this.cardGenerator.generateCard(cardNumber);
                
                if (cardNumbers.includes(number) && !this.markedNumbers[cardKey].includes(number)) {
                    this.markedNumbers[cardKey].push(number);
                    marked = true;
                }
            });
            return marked;
        }
        return false;
    }

    checkBingo() {
        for (let i = 0; i < this.selectedCards.length; i++) {
            const cardNumber = this.selectedCards[i];
            const cardKey = `card${i + 1}`;
            const markedNumbers = this.markedNumbers[cardKey];
            
            if (markedNumbers.length >= 5) {
                const pattern = this.checkWinningPattern(cardNumber, markedNumbers);
                if (pattern) {
                    return {
                        isBingo: true,
                        cardId: cardNumber,
                        pattern: pattern,
                        markedNumbers: markedNumbers
                    };
                }
            }
        }
        
        return { isBingo: false };
    }

    checkWinningPattern(cardNumber, markedNumbers) {
        const cardNumbers = this.cardGenerator.generateCard(cardNumber);
        
        // Check rows
        for (let row = 0; row < 5; row++) {
            let rowComplete = true;
            for (let col = 0; col < 5; col++) {
                const index = col * 5 + row;
                const number = cardNumbers[index];
                if (number !== 0 && !markedNumbers.includes(number)) {
                    rowComplete = false;
                    break;
                }
            }
            if (rowComplete) return `Row ${row + 1}`;
        }
        
        // Check columns
        for (let col = 0; col < 5; col++) {
            let colComplete = true;
            for (let row = 0; row < 5; row++) {
                const index = col * 5 + row;
                const number = cardNumbers[index];
                if (number !== 0 && !markedNumbers.includes(number)) {
                    colComplete = false;
                    break;
                }
            }
            if (colComplete) return `Column ${String.fromCharCode(65 + col)}`;
        }
        
        // Check diagonals
        let diag1Complete = true;
        let diag2Complete = true;
        
        for (let i = 0; i < 5; i++) {
            // Main diagonal
            const index1 = i * 5 + i;
            const number1 = cardNumbers[index1];
            if (number1 !== 0 && !markedNumbers.includes(number1)) {
                diag1Complete = false;
            }
            
            // Anti-diagonal
            const index2 = i * 5 + (4 - i);
            const number2 = cardNumbers[index2];
            if (number2 !== 0 && !markedNumbers.includes(number2)) {
                diag2Complete = false;
            }
        }
        
        if (diag1Complete) return 'Diagonal (Top-Left to Bottom-Right)';
        if (diag2Complete) return 'Diagonal (Top-Right to Bottom-Left)';
        
        // Check four corners
        const corners = [0, 4, 20, 24];
        let cornersComplete = true;
        for (const index of corners) {
            const number = cardNumbers[index];
            if (number !== 0 && !markedNumbers.includes(number)) {
                cornersComplete = false;
                break;
            }
        }
        
        if (cornersComplete) return 'Four Corners';
        
        return null;
    }

    getSelectedCards() {
        return [...this.selectedCards];
    }

    getCardNumbers(cardNumber) {
        return this.cardGenerator.generateCard(cardNumber);
    }

    getCardGrid(cardNumber) {
        return this.cardGenerator.generateGrid(cardNumber);
    }

    clearSelection() {
        this.selectedCards = [];
        this.markedNumbers = { card1: [], card2: [] };
    }
}

// ============================================
// CARD GENERATOR
// ============================================

class CardGenerator {
    constructor() {
        this.totalCards = 500;
        this.cache = new Map();
    }

    generateCard(cardNumber) {
        // Return cached if available
        if (this.cache.has(cardNumber)) {
            return this.cache.get(cardNumber);
        }
        
        // Validate card number
        if (cardNumber < 1 || cardNumber > this.totalCards) {
            cardNumber = 1;
        }
        
        // Generate deterministic card
        const seed = cardNumber * 7919;
        const numbers = [];
        
        // BINGO column ranges
        const ranges = [
            { min: 1, max: 15 },   // B
            { min: 16, max: 30 },  // I
            { min: 31, max: 45 },  // N
            { min: 46, max: 60 },  // G
            { min: 61, max: 75 }   // O
        ];
        
        // Generate 5 numbers for each column
        for (let col = 0; col < 5; col++) {
            const columnNumbers = this.generateColumnNumbers(
                seed + col,
                ranges[col].min,
                ranges[col].max
            );
            numbers.push(...columnNumbers);
        }
        
        // Center is FREE (0)
        numbers[12] = 0;
        
        // Cache result
        this.cache.set(cardNumber, numbers);
        
        return numbers;
    }

    generateColumnNumbers(seed, min, max) {
        const rng = this.createSeededRNG(seed);
        const available = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        
        // Shuffle and pick 5
        const shuffled = this.shuffleArray(available, rng);
        return shuffled.slice(0, 5).sort((a, b) => a - b);
    }

    createSeededRNG(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    shuffleArray(array, rng) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    generateGrid(cardNumber) {
        const numbers = this.generateCard(cardNumber);
        const grid = [];
        
        for (let row = 0; row < 5; row++) {
            const rowNumbers = [];
            for (let col = 0; col < 5; col++) {
                const index = col * 5 + row; // Column-major order
                rowNumbers.push(numbers[index]);
            }
            grid.push(rowNumbers);
        }
        
        return grid;
    }

    getRandomCard() {
        return Math.floor(Math.random() * this.totalCards) + 1;
    }
}

// ============================================
// INITIALIZE GAME
// ============================================

// Create global game instance
window.bingoGame = new BingoGameController();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BingoGameController,
        SocketManager,
        UIManager,
        AudioManager,
        CardManager,
        CardGenerator
    };
}