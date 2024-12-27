const { AzureOpenAI } = require("openai");
const dotenv = require("dotenv");
dotenv.config();

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.API_VERSION;
const deployment = process.env.DEPLOYMENT;

const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

let tokenTracker = {}; // Object to store token usage by assistantId
let blockedAssistants = new Set(); // Set to track blocked assistants
const TOKEN_LIMIT = 100000; // Define the token usage limit

function cleanResponseMessage(message) {
  return message.replace(/\【\d+:\d+†source\】/g, '');
}

const handleMessage = async (req, res) => {
  try {
    const { message, threadId, assistantId } = req.body;
    console.log("Received message:", message, threadId, assistantId);

    if (blockedAssistants.has(assistantId)) {
      // If the assistant is blocked, respond with an error
      return res.status(403).json({
        success: false,
        message: "Pour toute question supplémentaire, contactez-nous à contact@botcup.fr ou rendez-vous sur notre page de contact : https://www.botcup.fr/prendre-contact/",
      });
    }

    let assistant, thread;

    if (assistantId && threadId) {
      // Reuse existing assistant and thread
      assistant = { id: assistantId };
      thread = { id: threadId };
      console.log("Reusing assistant and thread:", assistantId, threadId);
    } else {
      // Step 1: Create an Assistant
      assistant = await client.beta.assistants.create({
        name: "ChatBotAi",
        instructions:
          "You are a helpful product support assistant and you answer questions based on the files provided to you only about botcup .write short 2 sentences max and precise responses. speak french .",
        model: deployment,
        tools: [{ type: "file_search" }],
        tool_resources: {
          "file_search": {
            "vector_store_ids": ["vs_w3qNt02S2n8zRTSCijOzGovJ"]
          }
        }
      });

      // Step 2: Create a Thread
      thread = await client.beta.threads.create();
      console.log("Thread created:", thread);
    }

    // Step 3: Add a Message to the Thread
    const userMessage = await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });
    console.log("Message added:", userMessage);
    console.time("AssistantRunTime");

    // Step 4: Run the Assistant
    console.log("Starting assistant run...");
    let run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
    });
    console.log("Run created:", run);
    // Update token usage
    if (run.status === "completed" && run.usage) {
      const totalTokens = run.usage.total_tokens;
      if (assistantId in tokenTracker) {
        tokenTracker[assistantId] += totalTokens; // Add to existing total
      } else {
        tokenTracker[assistantId] = totalTokens; // Start new total
      }
      console.log(`Tokens spent by assistant ${assistantId}: ${tokenTracker[assistantId]}`);

      // Check if token usage exceeds the limit
      if (tokenTracker[assistantId] > TOKEN_LIMIT) {
        console.log(`Assistant ${assistantId} has exceeded the token limit.`);
        blockedAssistants.add(assistantId); // Block the assistant
      }
    }

    // Step 5: Check run status and get messages
    if (run.status === "completed") {

      console.log("Fetching messages...");
      const messages = await client.beta.threads.messages.list(thread.id);
      messages.data.reverse();

      const responseMessage = cleanResponseMessage(messages.data[messages.data.length - 1]?.content[0].text.value);

      res.status(200).json({
        success: true,
        message: responseMessage,
        threadId: thread.id,
        assistantId: assistant.id,
      });

      console.timeEnd("AssistantRunTime");

    } else {
      console.log("Run not completed");
      res.status(500).json({
        success: false,
        message: "Assistant run not completed",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { handleMessage };
