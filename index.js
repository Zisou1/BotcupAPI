const express = require("express");
const cors = require("cors");
const { AzureOpenAI } = require("openai");
const { handleMessage } = require("./AiAssistant");


const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());



app.post("/api/message", handleMessage); // Use the handler


app.listen(port, async () => {
  console.log(`API is running on http://localhost:${port}`);
});
