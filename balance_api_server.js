/**
 * ASX Software Balance API Server
 * This server provides an API endpoint for the Discord bot to update user balances.
 * 
 * Setup:
 * 1. Install dependencies: npm install express cors body-parser
 * 2. Run: node balance_api_server.js
 * 3. Configure the Discord bot to use this API endpoint
 * 
 * The website will poll this endpoint to check for balance updates.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (in production, use a database)
let balances = {};
let balanceUpdates = []; // Track updates for polling

// API endpoint to update balance (called by Discord bot)
app.post('/api/balance/update', (req, res) => {
    const { username, amount, action = 'add' } = req.body;
    
    if (!username || amount === undefined) {
        return res.status(400).json({ error: 'Missing username or amount' });
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Update balance
    if (action === 'set') {
        balances[username] = numAmount;
    } else {
        balances[username] = (balances[username] || 0) + numAmount;
    }
    
    // Record update for polling
    balanceUpdates.push({
        username,
        newBalance: balances[username],
        timestamp: Date.now()
    });
    
    console.log(`Balance updated: ${username} -> $${balances[username].toFixed(2)} (${action} $${numAmount.toFixed(2)})`);
    
    res.json({ 
        success: true, 
        username, 
        newBalance: balances[username],
        message: `Balance ${action === 'set' ? 'set to' : 'increased by'} $${numAmount.toFixed(2)}`
    });
});

// API endpoint to get balance (called by website)
app.get('/api/balance/:username', (req, res) => {
    const { username } = req.params;
    const balance = balances[username] || 0;
    res.json({ username, balance });
});

// API endpoint to get recent updates (for polling)
app.get('/api/balance/updates/:username', (req, res) => {
    const { username } = req.params;
    const since = req.query.since ? parseInt(req.query.since) : 0;
    
    const updates = balanceUpdates.filter(
        u => u.username === username && u.timestamp > since
    );
    
    res.json({ updates });
});

// API endpoint to get all balances (admin only)
app.get('/api/balances', (req, res) => {
    res.json({ balances });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Start server
app.listen(PORT, () => {
    console.log(`ASX Balance API Server running on port ${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  POST http://localhost:${PORT}/api/balance/update`);
    console.log(`  GET  http://localhost:${PORT}/api/balance/:username`);
    console.log(`  GET  http://localhost:${PORT}/api/balance/updates/:username`);
    console.log(`  GET  http://localhost:${PORT}/api/balances`);
});

// For Discord bot integration, update the bot to call this API:
/*
In discord_bot_example.py, replace the webhook call with:

response = requests.post(
    'http://localhost:3000/api/balance/update',
    json={'username': username, 'amount': amount, 'action': 'add'}
)
*/
