class GameSocketClient {
    constructor(gameId, playerId, playerName) {
        this.gameId = gameId;
        this.playerId = playerId;
        this.playerName = playerName;
        
        // WebSocket connection
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        // Game state
        this.gameState = {
            status: 'connecting',
            players: [],
            calledNumbers: [],
            currentNumber: null,
            selectionTimeLeft: 60,
            availableCards: [],
            takenCards: [],
            myCards: [],
            isReady: false
        };
        
        // Event callbacks
        this.eventHandlers = {
            onGameUpdate: [],
            onNumberCalled: [],
            onPlayerJoined: [],
            onPlayerLeft: [],
            onCardsUpdated: [],
            onWinner: [],
            onError: []
        };
        
        this.init();
    }

    init() {
        this.connect();
        this.setupPingInterval();
    }

    connect() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.hostname}:3001`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('🎮 Connected to game server');
            this.reconnectAttempts = 0;
            this.joinGame();
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
            console.log('🎮 Disconnected from game server');
            this.gameState.status = 'disconnected';
            this.triggerEvent('onGameUpdate', this.gameState);
            
            // Attempt reconnect
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.connect();
                }, this.reconnectDelay * this.reconnectAttempts);
            }
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.triggerEvent('onError', error);
        };
    }

    joinGame() {
        this.send({
            type: 'join',
            data: {
                gameId: this.gameId,
                playerId: this.playerId,
                playerName: this.playerName
            }
        });
    }

    handleMessage(message) {
        const { type, data } = message;
        
        switch (type) {
            case 'joined':
                this.handleJoined(data);
                break;
            case 'game_update':
                this.handleGameUpdate(data);
                break;
            case 'number_called':
                this.handleNumberCalled(data);
                break;
            case 'player_joined':
                this.handlePlayerJoined(data);
                break;
            case 'player_left':
                this.handlePlayerLeft(data);
                break;
            case 'cards_taken':
                this.handleCardsTaken(data);
                break;
            case 'cards_selected':
                this.handleCardsSelected(data);
                break;
            case 'countdown':
                this.handleCountdown(data);
                break;
            case 'winner':
                this.handleWinner(data);
                break;
            case 'game_ending':
                this.handleGameEnding(data);
                break;
            case 'error':
                this.handleError(data);
                break;
            default:
                console.warn('Unknown message type:', type);
        }
    }

    handleJoined(data) {
        this.gameState = {
            ...this.gameState,
            ...data.game,
            status: 'joined'
        };
        this.triggerEvent('onGameUpdate', this.gameState);
    }

    handleGameUpdate(data) {
        this.gameState = { ...this.gameState, ...data };
        this.triggerEvent('onGameUpdate', this.gameState);
    }

    handleNumberCalled(data) {
        this.gameState.calledNumbers = data.calledNumbers;
        this.gameState.currentNumber = data.number;
        this.triggerEvent('onNumberCalled', data);
    }

    handlePlayerJoined(data) {
        this.gameState.players.push(data.player);
        this.gameState.playerCount = data.playerCount;
        this.triggerEvent('onPlayerJoined', data);
    }

    handleCardsTaken(data) {
        this.gameState.takenCards = data.takenCards || [];
        this.gameState.availableCards = data.availableCards || [];
        this.triggerEvent('onCardsUpdated', data);
    }

    handleCardsSelected(data) {
        this.gameState.myCards = data.cards;
        this.gameState.availableCards = data.availableCards;
        this.triggerEvent('onCardsUpdated', data);
    }

    handleCountdown(data) {
        this.gameState.countdown = data.seconds;
        this.triggerEvent('onGameUpdate', this.gameState);
    }

    handleWinner(data) {
        this.gameState.winner = data;
        this.gameState.status = 'ended';
        this.triggerEvent('onWinner', data);
        this.triggerEvent('onGameUpdate', this.gameState);
    }

    // Player actions
    selectCards(cardNumbers) {
        this.send({
            type: 'select_cards',
            data: {
                playerId: this.playerId,
                gameId: this.gameId,
                cards: cardNumbers
            }
        });
    }

    markReady() {
        this.send({
            type: 'ready',
            data: {
                playerId: this.playerId,
                gameId: this.gameId
            }
        });
    }

    markNumber(cardId, number) {
        this.send({
            type: 'mark_number',
            data: {
                playerId: this.playerId,
                gameId: this.gameId,
                cardId: cardId,
                number: number
            }
        });
    }

    claimBingo(cardId, pattern, markedNumbers) {
        this.send({
            type: 'claim_bingo',
            data: {
                playerId: this.playerId,
                gameId: this.gameId,
                cardId: cardId,
                pattern: pattern,
                markedNumbers: markedNumbers
            }
        });
    }

    sendChat(message) {
        this.send({
            type: 'chat',
            data: {
                playerId: this.playerId,
                gameId: this.gameId,
                message: message,
                timestamp: Date.now()
            }
        });
    }

    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.error('WebSocket not connected');
        }
    }

    // Event handling
    on(event, callback) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(callback);
        }
    }

    triggerEvent(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error);
                }
            });
        }
    }

    setupPingInterval() {
        // Keep connection alive
        setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Every 30 seconds
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }

    getGameState() {
        return { ...this.gameState };
    }

    isConnected() {
        return this.socket && this.socket.readyState === WebSocket.OPEN;
    }
}