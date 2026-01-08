/**
 * Bingo Board Class
 * Handles Bingo card generation, rendering, and interaction
 */

class BingoBoard {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            cardNumber: options.cardNumber || 1,
            cardIndex: options.cardIndex || 0,
            interactive: options.interactive !== false,
            showHeaders: options.showHeaders !== false,
            onMark: options.onMark || (() => {}),
            ...options
        };
        
        this.cardNumbers = [];
        this.markedNumbers = new Set();
        this.markedPositions = new Set();
        this.boardElements = [];
        this.grid = [];
        
        this.init();
    }
    
    init() {
        this.generateCardNumbers();
        this.render();
        if (this.options.interactive) {
            this.setupEventListeners();
        }
    }
    
    /**
     * Generate deterministic Bingo card numbers
     */
    generateCardNumbers() {
        const cardNumber = this.options.cardNumber;
        
        // Deterministic generation based on card number
        const seed = cardNumber * 7919; // Prime number
        this.cardNumbers = [];
        
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
            this.cardNumbers.push(...columnNumbers);
        }
        
        // Center is FREE (represented as 0)
        this.cardNumbers[12] = 0;
        
        // Convert to 5x5 grid (column-major order to row-major)
        this.grid = this.numbersToGrid(this.cardNumbers);
    }
    
    /**
     * Generate numbers for a single column
     */
    generateColumnNumbers(seed, min, max) {
        const rng = this.createSeededRNG(seed);
        const available = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        
        // Shuffle and pick 5
        const shuffled = this.shuffleArray(available, rng);
        return shuffled.slice(0, 5).sort((a, b) => a - b);
    }
    
    /**
     * Create seeded random number generator
     */
    createSeededRNG(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    /**
     * Shuffle array using seeded RNG
     */
    shuffleArray(array, rng) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    /**
     * Convert linear array to 5x5 grid
     */
    numbersToGrid(numbers) {
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
    
    /**
     * Render the Bingo board
     */
    render() {
        this.container.innerHTML = '';
        this.boardElements = [];
        
        // Create headers if enabled
        if (this.options.showHeaders) {
            this.renderHeaders();
        }
        
        // Create grid
        this.renderGrid();
        
        // Create card info
        this.renderCardInfo();
    }
    
    /**
     * Render column headers (B-I-N-G-O)
     */
    renderHeaders() {
        const headers = ['B', 'I', 'N', 'G', 'O'];
        const headerColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
        
        headers.forEach((letter, index) => {
            const header = document.createElement('div');
            header.className = 'grid-header';
            header.textContent = letter;
            header.style.color = headerColors[index];
            header.style.borderColor = headerColors[index];
            this.container.appendChild(header);
        });
    }
    
    /**
     * Render the 5x5 grid
     */
    renderGrid() {
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = this.createCell(row, col);
                this.boardElements.push(cell);
                this.container.appendChild(cell);
            }
        }
    }
    
    /**
     * Create a single cell
     */
    createCell(row, col) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        
        const number = this.grid[row][col];
       