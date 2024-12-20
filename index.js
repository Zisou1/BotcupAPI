const express = require("express");
const cors = require("cors");
const { getOpenAIResponse } = require("./apitest");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/api/message", async (req, res) => {
  try {
    const { message } = req.body;
    console.log("Received message:", message);

    const response = await getOpenAIResponse(message);
    console.log("OpenAI response:", response);

    res.status(200).json({
      success: true,
      message: response,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
app.post("/api/assistant", async (req, res) => {
  try {
    const { message } = req.body;
    console.log("Received message:", message);

    const response = await getOpenAIResponse(message);
    console.log("OpenAI response:", response);

    res.status(200).json({
      success: true,
      message: response,
    });
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
