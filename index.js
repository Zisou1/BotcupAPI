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
      'From: "Botcup Support" <contact@botcup.fr>',
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
      instructions: `You are a professional Customer Service Representative at Botcup. Your role is to:
        - Provide accurate solutions based on the knowledge base
        - Maintain a friendly, professional tone
        - Always respond in French
        - Use first-person perspective ("I", "we") as a Botcup representative
        - Reference only information found in the knowledge base
        - Never redirect customers to customer service
        - Provide specific, actionable solutions`,
      model: deployment,
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
    const prompt = `Context: You are responding as a Botcup Customer Service Representative to a client inquiry.

    Client Information:
    Nom: ${formData.name}
    Prénom: ${formData.surname}
    Téléphone: ${formData.phone}
    Email: ${formData.mail}
    Sujet: ${formData.subject}
    Message: ${formData.message}

    Instructions de réponse:
    1. Commencer par une phrase d'empathie comme:
       "Nous sommes désolés d'apprendre que vous rencontrez des difficultés avec notre produit. Je comprends votre frustration et je vais vous aider à résoudre ce problème."
    2. Utiliser les informations de notre base de connaissances pour répondre
    3. Adopter un ton professionnel mais chaleureux
    4. Inclure des émojis appropriés (2-3 maximum)
    5. Structurer la réponse en paragraphes clairs
    6. Fournir des solutions concrètes et applicables
    7. Ne pas utiliser de formules de conclusion
    8. Ne jamais rediriger vers le service client

    FORMAT DE RÉPONSE SOUHAITÉ:
    - Phrase d'empathie en ouverture
    - Solution détaillée basée sur les informations disponibles
    - Étapes concrètes si nécessaire
    - Ton rassurant et professionnel
    - Réponse directe au problème soulevé`;

    const userMessage = await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: prompt
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
