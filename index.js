const express = require("express");
const cors = require("cors");
const { getOpenAIResponse } = require("./apitest");
const { AzureOpenAI } = require("openai");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.API_VERSION;
const deployment = process.env.DEPLOYMENT;

const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

app.post("/api/message", async (req, res) => {
  try {
    const { message } = req.body;
    console.log("Received message:", message);

    // Step 1: Create an Assistant
    const assistant = await client.beta.assistants.create({
      name: "Math ",
      instructions:
        "You are a personal math tutor. Write and run code to answer math questions.",
      tools: [{ type: "code_interpreter" }],
      model: deployment,
    });
    console.log("Assistant created:", assistant);

    // Step 2: Create a Thread
    const thread = await client.beta.threads.create();
    console.log("Thread created:", thread);

    // Step 3: Add a Message to the Thread
    const userMessage = await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });
    console.log("Message added:", userMessage);

    // Step 4: Run the Assistant
    console.log("Starting assistant run...");
    let run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
      instructions: "help him",
    });
    console.log("Run created:", run);

    // Step 5: Check run status and get messages
    if (run.status === "completed") {
      console.log("Fetching messages...");
      const messages = await client.beta.threads.messages.list(thread.id);
      const responseMessage = messages.data
        .filter((msg) => msg.role === "assistant") // Filter only AI responses
        .map((msg) => msg.content[0].text.value)
        .join(" "); // Join the messages into a single string

      res.status(200).json({
        success: true,
        message: responseMessage,
      });
    } else {
      console.log("Run status:", run.status);
      res.status(200).json({
        success: false,
        status: run.status,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(port, async () => {
  console.log(`API is running on http://localhost:${port}`);
});
