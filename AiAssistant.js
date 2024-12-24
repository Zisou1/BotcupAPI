const { AzureOpenAI } = require("openai");
const dotenv = require("dotenv");
dotenv.config();

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.API_VERSION;
const deployment = process.env.DEPLOYMENT;

const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

const handleMessage = async (req, res) => {
  try {
    const { message, threadId, assistantId } = req.body;
    console.log("Received message:", message , threadId ,assistantId);

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
          "You are here to help the user . write short 2-3 sentences max and precise responses. speak french .",
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

    // Step 4: Run the Assistant
    console.log("Starting assistant run...");
    let run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
    });
    console.log("Run created:", run);

    // Step 5: Check run status and get messages
    if (run.status === "completed") {
      console.log("Fetching messages...");
      const messages = await client.beta.threads.messages.list(thread.id);
      messages.data.reverse();

      const responseMessage = messages.data[messages.data.length - 1]?.content[0].text.value;

      res.status(200).json({
        success: true,
        message: responseMessage,
        threadId: thread.id,
        assistantId: assistant.id,
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
};

module.exports = { handleMessage };
