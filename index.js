const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { AzureOpenAI } = require("openai");
const { handleMessage } = require("./AiAssistant");
const { google } = require('googleapis');
const { handleSav } = require("./savAssistant");
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.API_VERSION;
const deployment = process.env.DEPLOYMENT;
const app = express();
const port = 3000;

app.use(cors());
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

app.listen(port, async () => {
  console.log(`API is running on http://localhost:${port}`);
});
