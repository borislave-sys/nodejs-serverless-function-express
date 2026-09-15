import type { VercelRequest, VercelResponse } from '@vercel/node';

const SHOP = 'mydevstore-8208.myshopify.com';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { code, shop } = req.query;

  // Make sure Shopify sent the required parameters
  if (!code || !shop) {
    return res.status(400).send('Missing OAuth parameters.');
  }

  // Only allow the intended Shopify store
  if (shop !== SHOP) {
    return res.status(400).send('Invalid shop.');
  }

  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send(
      'Shopify API credentials are not configured in Vercel.'
    );
  }

  try {
    // Exchange Shopify's authorization code for an access token
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
      console.error('Shopify OAuth error:', data);

      return res.status(500).json({
        error: 'Failed to obtain Shopify access token.',
        details: data
      });
    }

    // TEMPORARY:
    // This displays the token once so you can copy it into
    // Vercel Environment Variables.
    //
    // DO NOT share the token with anyone.
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shopify Authorization Successful</title>
        </head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto;">
          <h1>Shopify authorization successful</h1>

          <p>
            Copy the access token below and add it to Vercel as:
          </p>

          <p>
            <strong>SHOPIFY_ACCESS_TOKEN</strong>
          </p>

          <p>
            <strong>Do not share this token.</strong>
          </p>

          <textarea
            style="width: 100%; height: 100px; font-family: monospace;"
            readonly
          >${data.access_token}</textarea>

          <p>
            After adding it to Vercel, redeploy the project.
          </p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('OAuth request failed:', error);

    return res.status(500).json({
      error: 'OAuth request failed.'
    });
  }
}
