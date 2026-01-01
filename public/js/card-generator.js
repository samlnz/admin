// ====================================================
// CARD GENERATOR - 500 Unique Deterministic Bingo Cards
// ====================================================

class CardGenerator {
    constructor() {
        this.totalCards = 500;
        this.generatedCards = new Map();
        
        // BINGO column ranges
        this.columnRanges = {
            'B': { min: 1, max: 15 },
            'I': { min: 16, max: 30 },
            'N': { min: 31, max: 45 },
            'G': { min: 46, max: 60 },
            'O': { min: 61, max: 75 }
        };
        
        // Generate ALL cards once
        this.ALL_CARDS = this.generateAllCards();
        console.log(`CardGenerator: Generated ${this.ALL_CARDS.length} unique bingo cards`);
    }

    // Generate ALL 500 cards once
    generateAllCards() {
        const allCards = [];
        for (let i = 1; i <= this.totalCards; i++) {
            allCards.push(this.createCard(i));
        }
        return allCards;
    }

    // Get a specific card (1-500)
    generateCard(cardNumber) {
        if (cardNumber < 1 || cardNumber > this.totalCards) {
            console.error(`Card number must be between 1 and ${this.totalCards}`);
            return this.generateDefaultCard();
        }
        return this.ALL_CARDS[cardNumber - 1];
    }

    // Create a unique, deterministic card
    createCard(cardNumber) {
        const seed = cardNumber * 9973 + 7919;
        const cardNumbers = [];
        const columns = ['B', 'I', 'N', 'G', 'O'];
        
        columns.forEach((column, colIndex) => {
            const range = this.columnRanges[column];
            const columnNumbers = this.generateColumnNumbers(cardNumber, colIndex, range.min, range.max);
            cardNumbers.push(...columnNumbers);
        });

        // Center is FREE (represented by 0)
        cardNumbers[12] = 0;

        return {
            id: cardNumber,
            numbers: cardNumbers,
            type: 'Fixed'
        };
    }

    // Generate 5 unique numbers for a column
    generateColumnNumbers(cardNumber, colIndex, min, max) {
        const seed = cardNumber * 100 + colIndex;
        const rng = this.createSeededRNG(seed);
        const availableNumbers = [];
        
        for (let i = min; i <= max; i++) {
            availableNumbers.push(i);
        }
        
        const shuffled = this.shuffleArray(availableNumbers, rng);
        const selected = shuffled.slice(0, 5).sort((a, b) => a - b);
        
        return selected;
    }

    // Seeded random number generator
    createSeededRNG(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    // Seeded shuffle
    shuffleArray(array, rng) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Default fallback card
    generateDefaultCard() {
        return {
            id: 0,
            numbers: [
                1, 16, 31, 46, 61,
                2, 17, 32, 47, 62,
                3, 18, 0, 48, 63,
                4, 19, 34, 49, 64,
                5, 20, 35, 50, 65
            ],
            type: 'Default'
        };
    }

    // Convert to 5x5 grid
    numbersToGrid(cardNumbers) {
        const grid = [];
        for (let row = 0; row < 5; row++) {
            const rowNumbers = [];
            for (let col = 0; col < 5; col++) {
                const index = col * 5 + row;
                const number = cardNumbers[index];
                rowNumbers.push(number === 0 ? 'FREE' : number);
            }
            grid.push(rowNumbers);
        }
        return grid;
    }
}

// Create global instance
const cardGenerator = new CardGenerator();