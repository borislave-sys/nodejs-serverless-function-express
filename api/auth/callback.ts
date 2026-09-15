import type { VercelRequest, VercelResponse } from '@vercel/node';

const SHOP = 'mydevstore-8208.myshopify.com';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { code, shop, hmac } = req.query;

  if (!code || !shop) {
    return res.status(400).send('Missing OAuth parameters.');
  }

  if (shop !== SHOP) {
    return res.status(400).send('Invalid shop.');
  }

  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send('Shopify credentials are not configured.');
  }

  try {
    const response = await fetch(
      `https://${SHOP}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: String(code)
        }).toString()
      }
    );

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      console.error(data);

      return res.status(500).json({
        error: 'Failed to obtain Shopify access token.',
        details: data
      });
    }

return res.status(200).send(`
  <h1>Shopify authorization successful</h1>
  <p>Copy the access token below and add it to Vercel.</p>
  <p><strong>Do not share this token.</strong></p>
  <textarea style="width:100%;height:100px;">${data.access_token}</textarea>
`);
  }
