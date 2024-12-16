const { AzureOpenAI } = require("openai");
const dotenv = require("dotenv");
dotenv.config();

const endpoint = process.env["AZURE_OPENAI_ENDPOINT"];
const apiKey = process.env["AZURE_OPENAI_API_KEY"];
const apiVersion = process.env["API_VERSION"];
const deployment = process.env["DEPLOYMENT"];

const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

async function getOpenAIResponse() {
  try {
    const result = await client.chat.completions.create({
      model: deployment,
      messages: [
        {
          role: "user",
          content: "How are you doing "
        }
      ]
    });
    console.log("OpenAI Response:", result.choices[0].message);
    return result.choices[0].message;
  } catch (error) {
    console.error("Error fetching response:", error);
    throw error;
  }
}

module.exports = { getOpenAIResponse };