// Telegram Web App initialization

class TelegramManager {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.isInitialized = false;
        this.userData = null;
    }

    init() {
        if (!this.tg) {
            console.warn('Telegram Web App SDK not found. Running in standalone mode.');
            this.isInitialized = false;
            return false;
        }

        try {
            // Expand to full screen
            this.tg.expand();
            
            // Enable closing confirmation
            this.tg.enableClosingConfirmation();
            
            // Set background color
            this.tg.setBackgroundColor('#0f2027');
            
            // Set header color
            this.tg.setHeaderColor('#00b4d8');
            
            // Get user data
            if (this.tg.initDataUnsafe?.user) {
                this.userData = this.tg.initDataUnsafe.user;
                
                // Update game state
                if (gameState) {
                    gameState.playerName = this.userData.first_name || 'Telegram User';
                    if (this.userData.last_name) {
                        gameState.playerName += ' ' + this.userData.last_name;
                    }
                    gameState.playerId = this.userData.id.toString();
                }
            }
            
            // Setup event handlers
            this.setupEventHandlers();
            
            this.isInitialized = true;
            console.log('Telegram Web App initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Telegram Web App:', error);
            this.isInitialized = false;
            return false;
        }
    }

    setupEventHandlers() {
        // Handle viewport changes
        this.tg.onEvent('viewportChanged', () => {
            console.log('Viewport changed');
        });

        // Handle theme changes
        this.tg.onEvent('themeChanged', () => {
            this.applyTheme();
        });

        // Handle back button
        this.tg.onEvent('backButtonClicked', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                this.tg.close();
            }
        });

        // Show back button on non-index pages
        if (!window.location.pathname.includes('index.html')) {
            this.tg.BackButton.show();
        }
    }

    applyTheme() {
        const theme = this.tg.colorScheme;
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.style.setProperty('--bg-primary', '#0f2027');
            root.style.setProperty('--text-primary', '#ffffff');
        } else {
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--text-primary', '#000000');
        }
    }

    getUserData() {
        return this.userData;
    }

    getUserId() {
        return this.userData?.id || '0000';
    }

    getUserName() {
        if (!this.userData) return 'Telegram User';
        
        let name = this.userData.first_name || '';
        if (this.userData.last_name) {
            name += ' ' + this.userData.last_name;
        }
        return name || 'Telegram User';
    }

    getUserAvatarText() {
        if (!this.userData) return 'T';
        return (this.userData.first_name?.[0] || 'T').toUpperCase();
    }

    shareMessage(text) {
        if (this.tg?.shareMessage) {
            this.tg.shareMessage(text);
            return true;
        }
        return false;
    }

    showAlert(message) {
        if (this.tg?.showAlert) {
            this.tg.showAlert(message);
            return true;
        }
        return false;
    }

    showConfirm(message, callback) {
        if (this.tg?.showConfirm) {
            this.tg.showConfirm(message, callback);
            return true;
        }
        return false;
    }

    close() {
        if (this.tg?.close) {
            this.tg.close();
            return true;
        }
        return false;
    }

    sendData(data) {
        if (this.tg?.sendData) {
            this.tg.sendData(JSON.stringify(data));
            return true;
        }
        return false;
    }
}

// Create global instance
const telegramManager = new TelegramManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    telegramManager.init();
    
    // Apply theme
    telegramManager.applyTheme();
    
    // Update user info in game state
    if (gameState) {
        gameState.playerName = telegramManager.getUserName();
        gameState.playerId = telegramManager.getUserId();
    }
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TelegramManager, telegramManager };
}