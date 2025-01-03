const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { AzureOpenAI } = require("openai");
const { handleMessage } = require("./AiAssistant");
const { google } = require('googleapis');
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.API_VERSION;
const deployment = process.env.DEPLOYMENT;
const app = express();
const port = 3000;

// Configure Gmail OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Function to create draft email
async function createDraft(formData, responseMessage) {
  try {
    // Ensure email address exists
    if (!formData.mail) {
      throw new Error('Recipient email is required');
    }

    const utf8Subject = `=?utf-8?B?${Buffer.from('L\'équipe Botcup à votre écoute').toString('base64')}?=`;
    const messageParts = [
      'From: "Botcup Support" <zakaria.ouldhamouda.dz@gmail.com>',
      `To: ${formData.mail}`, // Properly formatted To header
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      `
      <html>
        <body style="font-family: Altivo, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
          <img src="https://www.botcup.fr/wp-content/uploads/2024/12/LOGOTYPE-Noir.png" alt="Botcup" style="width: 100px; height: auto; display: block; margin: 0 auto 20px;">
            <p style="color: #333;">Bonjour ${formData.name},</p>
            <div style="white-space: pre-wrap;">${responseMessage}</div>
            <p>Cordialement,</p>
            <p>L'équipe support Botcup</p>
          </div>
        </body>
      </html>`
    ];

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const draft = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage
        }
      }
    });

    console.log('Draft created:', draft.data);
    return draft.data;
  } catch (err) {
    console.error('Error creating draft:', err);
    throw err;
  }
}

app.use(cors());
app.use(express.json());

app.post("/api/message", handleMessage); // Use the handler

app.post("/sav", async (req, res) => {
  const formData = req.body; // Access the sent JSON data
  console.log("Received form data:", formData);
  res.json({
    success: true,
  }); // Log the data to console

  try {
    const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

console.log("Client:", deployment);
    // Step 1: Create a new Assistant with File Search Enabled
    const assistant = await client.beta.assistants.create({
      name: "SAV Helper Assistant",
      instructions: "You are an  Service client of botcup act as you are answering peopls incquiries . You can use the file search tool to find relevant information in the knowledge base related to SAV, including troubleshooting, providing solutions, and answering questions in French .",
      model:deployment,
      tools: [{ type: "file_search" }],
      tool_resources: {
        "file_search": {
          "vector_store_ids": ["vs_7Cehthr3xVnIBFhNqqgb86h6"]
        }
      }
    });
    thread = await client.beta.threads.create();
      console.log("Thread created:", thread);
    // Step 2: Create a prompt to find a solution for the issue
    const prompt = `The client has provided the following information:
    Name: ${formData.name}
    surname: ${formData.surname}
    Number: ${formData.phone}
    mail: ${formData.mail}
    sujet: ${formData.subject}
    Text: ${formData.message}

    Based on this information and the information of the file provide a detailed solution for the issue described in the text. Do not include any greetings or closing phrases. Do not write the object. Add some emojis to make it more friendly and human-like. Don't use bullet points, write using paragraphs. Don't say contact service client because you are service client. `;

    const userMessage = await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: prompt,
    });

console.log("Response:", userMessage);
let run = await client.beta.threads.runs.createAndPoll(thread.id, {
  assistant_id: assistant.id,
});
console.log("Run:", run);
const messages = await client.beta.threads.messages.list(thread.id);
messages.data.reverse();
const responseMessage = messages.data[messages.data.length - 1]?.content[0].text.value;

    // Create draft email with the response
    const draft = await createDraft(formData, responseMessage);

    // Step 4: Send the response back to the client
   console.log("Response:", responseMessage);
   

  } catch (error) {
    console.error("Error creating assistant or getting solution:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, async () => {
  console.log(`API is running on http://localhost:${port}`);
});
