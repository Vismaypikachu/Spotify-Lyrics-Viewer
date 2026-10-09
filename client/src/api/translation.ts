import Config from "../config";

interface ITranslationResponse {
  translation: string;
  detectedLanguage?: string;
}

export async function translateLyric(
  text: string
): Promise<string | null> {
  const response = await fetch(`${Config.api.root}/api/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    return null;
  }

  const data: ITranslationResponse = await response.json();

  // Don't display a translation for lyrics already in English.
  if (data.detectedLanguage?.toLowerCase() === "en") {
    return null;
  }

  return data.translation || null;
}