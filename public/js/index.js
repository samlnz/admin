// Index page functionality

class IndexPage {
    constructor() {
        this.gameState = gameState;
        this.telegramManager = telegramManager;
        this.startGameBtn = document.getElementById('startGameBtn');
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.startGameBtn.addEventListener('click', () => {
            this.handleStartGame();
        });
    }

    handleStartGame() {
        // Show loading
        this.startGameBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> LOADING...';
        this.startGameBtn.disabled = true;
        
        // Navigate to card selection immediately
        setTimeout(() => {
            BingoUtils.navigateTo('choose-cards.html');
        }, 500);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new IndexPage();
});