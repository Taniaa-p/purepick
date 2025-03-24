const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Define Schema & Model
const shampooSchema = new mongoose.Schema({
    name: String,
    ingredients: {
        harmful: [String],
        beneficial: [String],
    },
    sustainabilityScore: Number,
    alternatives: [String],
});

const Shampoo = mongoose.model("Shampoo", shampooSchema);

// Fetch shampoo data from OpenRouter
async function fetchShampooData(shampooName) {
    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "qwen-turbo", // Updated to a valid model
                messages: [
                    {
                        role: "system",
                        content: "You are an AI that extracts only shampoo ingredients from product labels."
                    },
                    {
                        role: "user",
                        content: `Give ONLY the full ingredient list of "${shampooName}" as printed on the product label. 
                        Do not add explanations, descriptions, or extra details. Provide the ingredients in a comma-separated format.`
                    }
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (response.data?.choices?.[0]?.message?.content) {
            return response.data.choices[0].message.content.trim();
        } else {
            throw new Error("Invalid response structure from Qwen.");
        }
    } catch (error) {
        console.error("❌ Error fetching shampoo data:", error.response ? error.response.data : error.message);
        return null;
    }
}

// API to get shampoo details
app.get("/shampoo/:name", async (req, res) => {
    const shampooName = req.params.name.toLowerCase();

    try {
        let shampoo = await Shampoo.findOne({ name: shampooName });

        if (!shampoo) {
            console.warn(`⚠️ Shampoo "${shampooName}" not found in database. Fetching from Qwen via OpenRouter...`);

            const ingredientsText = await fetchShampooData(shampooName);
            if (!ingredientsText) {
                return res.status(500).json({ error: "Failed to fetch shampoo data." });
            }

            // Convert to an ingredient array
            const ingredientList = ingredientsText.split(",").map(i => i.trim());

            // Categorization logic for harmful ingredients (expand this list)
            const harmfulKeywords = ["SLS", "paraben", "sulfate", "formaldehyde", "triclosan", "phthalate", "silicone"];
            const harmfulIngredients = ingredientList.filter(i => harmfulKeywords.some(keyword => i.toLowerCase().includes(keyword)));
            const beneficialIngredients = ingredientList.filter(i => !harmfulIngredients.includes(i));

            shampoo = new Shampoo({
                name: shampooName,
                ingredients: {
                    harmful: harmfulIngredients,
                    beneficial: beneficialIngredients,
                },
                sustainabilityScore: 100 - (harmfulIngredients.length * 10),
                alternatives: [] // Future implementation
            });

            await shampoo.save();
            console.log(`✅ Shampoo "${shampooName}" data saved to MongoDB.`);
        }

        res.json(shampoo);
    } catch (error) {
        console.error("❌ Error retrieving shampoo data:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
