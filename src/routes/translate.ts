
import express from "express";

export const subRoute = "/api/translate";

const router = express.Router();

router.post("/", async (req, res) => {
  const text: unknown = req.body?.text;

  if (typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "Please provide text to translate." });
    return;
  }

  if (text.length > 1000) {
    res.status(400).json({ error: "Text is too long." });
    return;
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    console.error("GOOGLE_TRANSLATE_API_KEY is not configured.");
    res.status(500).json({ error: "Translation is not configured." });
    return;
  }

  try {
    const detectResponse = await fetch(
  `https://translation.googleapis.com/language/translate/v2/detect?key=${encodeURIComponent(apiKey)}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text.trim() })
  }
);

const detectResult = await detectResponse.json() as {
  data?: {
    detections?: Array<Array<{
      language: string;
      confidence: number;
    }>>;
  };
};

if (!detectResponse.ok) {
  res.status(502).json({ error: "Language detection failed." });
  return;
}

const detectedLanguage =
  detectResult.data?.detections?.[0]?.[0]?.language;

if (!detectedLanguage) {
  res.status(502).json({ error: "Unable to detect language." });
  return;
}

if (detectedLanguage.toLowerCase() === "en") {
  res.json({
    translation: "",
    detectedLanguage
  });
  return;
}

// Only non-English text reaches the translation endpoint.
const googleResponse = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text.trim(),
          target: "en",
          format: "text"
        })
      }
    );

    const result = await googleResponse.json() as {
      data?: {
        translations?: Array<{ translatedText: string }>;
      };
    };

    if (!googleResponse.ok) {
      res.status(502).json({ error: "Translation service failed." });
      return;
    }

    res.json({
      translation: result.data?.translations?.[0]?.translatedText ?? "",
      detectedLanguage
    });
  } catch (error) {
    console.error("Translation request failed:", error);
    res.status(502).json({ error: "Unable to translate text." });
  }
});

export default router;
