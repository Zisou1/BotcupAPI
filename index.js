const express = require('express');
const { getOpenAIResponse } = require('./apitest'); // Import the function

const app = express();
const port = 3000;  // Or your custom port

// Middleware to parse JSON bodies
app.use(express.json());

// Define the API endpoint to receive the data
app.post('/api/endpoint', (req, res) => {
    const { key1, key2 } = req.body;

    // Check if data is received
    if (!key1 || !key2) {
        return res.status(400).json({ message: 'Missing required data.' });
    }

    // For testing, log the received data to the console
    console.log('Received data:', { key1, key2 });

    // Send a success response
    return res.status(200).json({ message: 'Request was successful!' });
});

// Start the server
app.listen(port, async () => {
    console.log(`API is running on http://localhost:${port}`);
     getOpenAIResponse(); // Execute the OpenAI function
});