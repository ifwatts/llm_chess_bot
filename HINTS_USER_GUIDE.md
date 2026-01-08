# 🎯 User Guide: Learning Mode & Hints Feature

## 📍 What the User Should See

When you open the chess application at `http://localhost:5001`, you should see:

### 1. **New UI Elements**
Below the chess board, you'll find a new **Learning Mode** section with:

- **🟢 "Get Hint" Button** - Green button to request move suggestions
- **🔘 Learning Mode Toggle** - Checkbox to enable/disable learning features  
- **📋 Hint Level Selector** - Dropdown with Basic/Intermediate/Advanced options
- **💡 Hint Display Panel** - Initially hidden, shows hints when requested

### 2. **Visual Layout**
```
┌─────────────────────────────────────┐
│         Chess Board                │
├─────────────────────────────────────┤
│  [Reset Game] [Get Hint]          │  ← New buttons
├─────────────────────────────────────┤
│  🎓 Learning Mode                  │
│  ☐ Enable Learning Mode           │  ← New toggle
│  Hint Level: [Basic ▼]            │  ← New selector
│  ┌─────────────────────────────┐   │
│  │        Hint (Hidden)        │   │  ← Hint display (appears when used)
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  🎮 Computer Skill Level           │
│  ◄────●────► Intermediate (5)     │  ← Existing slider
└─────────────────────────────────────┘
```

## 🎮 How to Use the Hints Feature

### Step 1: **Enable Learning Mode** (Optional)
1. Look for the "Learning Mode" section below the chess board
2. Click the checkbox next to "Enable Learning Mode"
3. This activates the enhanced learning features

### Step 2: **Choose Hint Level**
1. Use the "Hint Level" dropdown to select complexity:
   - **Basic**: Simple explanations (1-2 sentences)
   - **Intermediate**: Tactical details (2-3 sentences)  
   - **Advanced**: Strategic analysis (3-4 sentences)

### Step 3: **Request a Hint**
1. **Wait for your turn** - Hints only work when it's White's turn (your turn)
2. Click the **"Get Hint"** button
3. The button will show "Generating hint..." while processing
4. After a few seconds, you'll see:
   - **Green highlighting** on the suggested squares
   - **Animated arrow** showing the move direction
   - **Hint display panel** appearing with:
     - Suggested move (e.g., "e2-e4")
     - Explanation text
     - Color-coded category indicator

### Step 4: **Use the Hint**
1. Look at the highlighted squares on the board
2. Read the explanation to understand why this move is good
3. Make the suggested move by clicking the pieces as normal
4. The hint will automatically clear after you move

## 🔄 When Hints Show Up

### ✅ **Hints ARE Available When:**
- It's **your turn** (you're playing as White)
- The game is **not over** (no checkmate/stalemate)
- The computer is **not thinking** (not AI's turn)

### ❌ **Hints ARE NOT Available When:**
- It's the **computer's turn** (AI is thinking - Black to move)
- The game is **over** (checkmate, stalemate, etc.)
- The board is in an **invalid state**

**🔧 Important**: If you try to get a hint when it's not your turn, you'll see an error message: "Hints are only available on your turn (White to move)"

## 🎨 Visual Feedback

### **What You'll See:**
1. **Green highlighting** on the piece to move and destination square
2. **Light bulb icon** (💡) with pulsing animation on suggested squares
3. **Animated arrow** pointing from source to destination
4. **Color-coded explanation** based on move type:
   - 🔴 **Red** - Capture moves
   - 🟠 **Orange** - Check moves
   - 🟣 **Purple** - Checkmate moves
   - 🔵 **Blue** - Development moves
   - 🟢 **Green** - Center control moves
   - 🟡 **Yellow** - Castling moves

### **Example Hint Display:**
```
💡 Hint
─────────────────
Suggested move: e2-e4
Control the center - this is a key strategic principle in chess.
```

## 🔧 Turning Features On/Off

### **Learning Mode Toggle:**
- **☐ Checked** = Learning mode enabled (full functionality)
- **☐ Unchecked** = Learning mode disabled (hints still work but less enhanced)

### **Hint Level Selection:**
- **Basic** = Simple, beginner-friendly explanations
- **Intermediate** = Moderate detail with tactical concepts
- **Advanced** = Deep strategic analysis

### **Automatic Clearing:**
Hints automatically disappear when:
- You make a move
- Computer responds
- Game is reset
- Board state changes

## 🐛 Troubleshooting

### **"Get Hint" Button Not Working:**
1. Make sure it's **your turn** (White to move)
2. Check that the game **isn't over**
3. Wait for the computer to finish thinking if it's AI's turn
4. Try refreshing the page if the button seems unresponsive

### **"Hints are only available on your turn" Error:**
1. This is normal! It means it's the computer's turn (Black to move)
2. Wait for the computer to make its move
3. Then you can request a hint

### **No Visual Highlighting:**
1. Check if JavaScript is enabled in your browser
2. Look for browser console errors (F12 → Console)
3. Try refreshing the page
4. Ensure the board has loaded completely

### **Hints Taking Too Long:**
1. The LLM processing can take 3-10 seconds (normal)
2. If using fallback mode, hints appear instantly
3. Check the Ollama service status if using full LLM

## 🎯 Best Practices

1. **Start with Basic hints** if you're new to chess
2. **Read the explanations** to learn the "why" behind moves
3. **Try the suggested move** to see how it plays out
4. **Gradually increase difficulty** as you improve
5. **Use hints for learning**, not just to win quickly

---

**🎮 The Learning Mode is designed to make chess education fun and interactive!**
