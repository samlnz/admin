# File: game_logic.py
import random
from datetime import datetime

class BingoGame:
    def __init__(self, game_id, entry_price):
        self.game_id = game_id
        self.entry_price = entry_price
        self.status = "waiting"  # waiting, active, finished
        self.players = {}  # user_id -> {board, marked, cartela_number}
        self.called_numbers = []
        self.all_numbers = list(range(1, 76))  # Standard Bingo: 1-75
        self.available_numbers = self.all_numbers.copy()
        self.winner = None
        self.pool = 0
        self.min_players = 2
        self.created_at = datetime.utcnow()
        
    def add_player(self, user_id, cartela_number=None):
        """Add a player to the game with an optional cartela number"""
        if user_id in self.players:
            return self.players[user_id]['board']
        
        # Generate a unique cartela number if not provided
        if cartela_number is None:
            used_numbers = {p.get('cartela_number') for p in self.players.values()}
            cartela_number = 1
            while cartela_number in used_numbers:
                cartela_number += 1
        
        # Check if cartela number is available
        used_numbers = {p.get('cartela_number') for p in self.players.values()}
        if cartela_number in used_numbers:
            return None
        
        # Generate board (5x5 with FREE in center)
        board = self.generate_board()
        
        self.players[user_id] = {
            'board': board,
            'marked': [False] * 25,  # 5x5 grid
            'cartela_number': cartela_number
        }
        
        # Mark center as free
        self.players[user_id]['marked'][12] = True
        
        # Add entry fee to pool
        self.pool += self.entry_price
        
        return board
    
    def generate_board(self):
        """Generate a random Bingo board (5x5 with numbers 1-75)"""
        board = []
        
        # Bingo columns: B(1-15), I(16-30), N(31-45), G(46-60), O(61-75)
        ranges = [(1, 15), (16, 30), (31, 45), (46, 60), (61, 75)]
        
        for col in range(5):
            start, end = ranges[col]
            numbers = random.sample(range(start, end + 1), 5)
            board.extend(numbers)
        
        # Set center as FREE (0 represents FREE)
        board[12] = 0
        
        return board
    
    def start_game(self):
        """Start the game if enough players have joined"""
        if len(self.players) >= self.min_players and self.status == "waiting":
            self.status = "active"
            return True
        return False
    
    def call_number(self):
        """Call a random number that hasn't been called yet"""
        if not self.available_numbers or self.status != "active":
            return None
        
        number = random.choice(self.available_numbers)
        self.available_numbers.remove(number)
        self.called_numbers.append(number)
        
        return number
    
    def mark_number(self, user_id, number):
        """Mark a number on a player's board"""
        if user_id not in self.players or self.status != "active":
            return False
        
        player = self.players[user_id]
        
        # Check if number is on the board
        if number in player['board']:
            index = player['board'].index(number)
            player['marked'][index] = True
            return True
        
        return False
    
    def check_winner(self, user_id):
        """Check if a player has won"""
        if user_id not in self.players:
            return False, "Player not found"
        
        player = self.players[user_id]
        marked = player['marked']
        
        # Check rows
        for row in range(5):
            if all(marked[row*5 + col] for col in range(5)):
                return True, "Bingo! Row complete!"
        
        # Check columns
        for col in range(5):
            if all(marked[row*5 + col] for row in range(5)):
                return True, "Bingo! Column complete!"
        
        # Check diagonals
        if all(marked[i*5 + i] for i in range(5)):  # Top-left to bottom-right
            return True, "Bingo! Diagonal complete!"
        
        if all(marked[i*5 + (4-i)] for i in range(5)):  # Top-right to bottom-left
            return True, "Bingo! Diagonal complete!"
        
        return False, "No win yet"
    
    def end_game(self, winner_id):
        """End the game and declare a winner"""
        if winner_id not in self.players:
            return False
        
        self.status = "finished"
        self.winner = winner_id
        return True
    
    def format_number(self, number):
        """Format number with BINGO letter"""
        if number <= 15:
            return f"B{number}"
        elif number <= 30:
            return f"I{number}"
        elif number <= 45:
            return f"N{number}"
        elif number <= 60:
            return f"G{number}"
        else:
            return f"O{number}"
    
    def get_player_board_display(self, user_id):
        """Get formatted board display for a player"""
        if user_id not in self.players:
            return None
        
        player = self.players[user_id]
        board = player['board']
        marked = player['marked']
        
        display = []
        for i in range(5):  # 5 rows
            row = []
            for j in range(5):  # 5 columns
                idx = i * 5 + j
                num = board[idx]
                if num == 0:
                    row.append("FREE")
                elif marked[idx]:
                    row.append(f"[{self.format_number(num)}]")
                else:
                    row.append(self.format_number(num))
            display.append(" ".join(row))
        
        return "\n".join(display)