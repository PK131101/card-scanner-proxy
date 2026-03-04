export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { frontImage, backImage } = req.body;
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
    if (!frontImage) return res.status(400).json({ error: 'No image provided' });

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
      text: `You are a highly accurate business card data extraction specialist. Your job is to read every single character from this business card with 100% accuracy.

CRITICAL RULES:
1. Copy text EXACTLY as it appears - every dot, dash, comma, space, capital letter, special character
2. Phone numbers: Copy EVERY digit exactly. Do NOT guess, add or remove any digit. Include country code if shown (e.g. +91, +1)
3. Email addresses: Copy EXACTLY including dots, underscores, dashes. Double check domain (e.g. .com, .in, .co.in)
4. Names: Preserve exact capitalization and spelling
5. If you are not 100% sure about a character, look again very carefully
6. Never guess or approximate - only extract what you can clearly see
7. If a field is not visible or unclear, use null

Return ONLY a valid JSON object with NO extra text, NO markdown, NO backticks:
{
  "name": "Exact full name as written",
  "jobTitle": "Exact job title as written",
  "company": "Exact company name as written",
  "phone": "Exact phone number with every digit",
  "alternatePhone": "Exact alternate phone or null",
  "email": "Exact email address",
  "alternateEmail": "Exact alternate email or null",
  "website": "Exact website URL",
  "address": "Complete address exactly as written",
  "linkedIn": "LinkedIn URL or username or null",
  "twitter": "Twitter handle or null"
}`
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
        temperature: 0,
        messages: [{ role: 'user', content: imageContent }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: JSON.stringify(data) });
    }

    const text = data.content[0].text;
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const contactData = JSON.parse(cleanText);

    return res.status(200).json(contactData);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
