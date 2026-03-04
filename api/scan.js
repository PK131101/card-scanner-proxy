export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { frontImage, backImage } = req.body;
    const apiKey = process.env.CLAUDE_API_KEY;

    const imageContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: frontImage,
        }
      }
    ];

    if (backImage) {
      imageContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: backImage,
        }
      });
    }

    imageContent.push({
      type: 'text',
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
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: imageContent
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    const text = data.content[0].text;
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const contactData = JSON.parse(cleanText);

    return res.status(200).json(contactData);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
