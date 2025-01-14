const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { AzureOpenAI } = require("openai");
const { handleMessage } = require("./AiAssistant");
const { google } = require('googleapis');
const { handleSav } = require("./savAssistant");

const app = express();
const port = 3000;

// Define CORS options to allow a specific origin
const corsOptions = {
  origin: 'https://www.botcup.fr', // Allow only this origin
  methods: ['GET', 'POST'],       // Allow only GET and POST methods
  allowedHeaders: ['Content-Type'], // Allow specific headers
};

app.use(cors(corsOptions)); // Use refined CORS configuration
app.use(express.json());

let requestQueue = [];
let isProcessing = false;

const processQueue = async () => {
  if (requestQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const { req, res, handler } = requestQueue.shift();
  await handler(req, res);
  processQueue();
};

const addToQueue = (handler) => (req, res) => {
  requestQueue.push({ req, res, handler });
  if (!isProcessing) {
    processQueue();
  }
};

app.post("/api/message", handleMessage); // Use the handler with queue

app.post("/sav", addToQueue(handleSav)); // Use the handler with queue
app.get("/", (req, res) => {
  res.send("Hello World");
});
app.listen(port, async () => {
  console.log(`API is running on http://localhost:${port}`);
});
