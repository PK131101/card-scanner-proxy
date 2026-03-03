const https = require('https');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { frontImage, backImage } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const parts = [
      {
        text: `You are an expert business card reader. Extract ALL information from this business card image(s) accurately.

Return ONLY a valid JSON object with these exact fields (use null for missing fields):
{
  "name": "Full name of person",
  "jobTitle": "Job title or designation",
  "company": "Company or organization name",
  "phone": "Primary phone number with country code if visible",
  "alternatePhone": "Secondary phone number if any",
  "email": "Primary email address",
  "alternateEmail": "Secondary email if any",
  "website": "Website URL",
  "address": "Full address",
  "linkedIn": "LinkedIn profile URL or username",
  "twitter": "Twitter handle"
}

Rules:
- Extract EXACTLY what is on the card
- Include country codes for phone numbers if shown
- Return ONLY the JSON, no other text`
      },
      {
        inline_data: {
          mime_type: 'image/jpeg',
          data: frontImage
        }
      }
    ];

    if (backImage) {
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: backImage
        }
      });
    }

    const requestBody = JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      }
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    const text = data.candidates[0].content.parts[0].text;
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const contactData = JSON.parse(cleanText);

    return res.status(200).json(contactData);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
