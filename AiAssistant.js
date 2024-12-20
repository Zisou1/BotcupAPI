const dotenv = require("dotenv");
dotenv.config();

const { AzureOpenAI } = require("openai");

const endpoint = process.env["AZURE_OPENAI_ENDPOINT"];
const apiKey = process.env["AZURE_OPENAI_API_KEY"];
const apiVersion = process.env["API_VERSION"];
const deployment = process.env["DEPLOYMENT"]; // Replace this value with the deployment name for your model.

const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

async function main() {
  const assistant = await client.beta.assistants.create({
    name: "Math Tutor",
    instructions:
      "You are a personal math tutor. Write and run code to answer math questions.",
    tools: [{ type: "code_interpreter" }],
    model: "gpt-4o",
  });

  console.log(assistant);
}

main().catch(console.error);
