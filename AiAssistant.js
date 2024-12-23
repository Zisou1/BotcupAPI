const dotenv = require("dotenv");
dotenv.config();

const { AzureOpenAI } = require("openai");

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.API_VERSION;
const deployment = process.env.DEPLOYMENT;

const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

async function main() {
  try {
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
    const message = await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: "Hi my name is zakaria",
    });
    console.log("Message added:", message);

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
      for (const msg of messages.data.reverse()) {
        console.log(`${msg.role} > ${msg.content[0].text.value}`);
      }
    } else {
      console.log("Run status:", run.status);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
