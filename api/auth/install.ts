import type { VercelRequest, VercelResponse } from '@vercel/node';

const SHOP = 'mydevstore-8208.myshopify.com';

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const clientId = process.env.SHOPIFY_API_KEY;

  if (!clientId) {
    return res.status(500).send('SHOPIFY_API_KEY is not configured.');
  }

  const redirectUri =
    'https://nodejs-serverless-function-express-self-sigma.vercel.app/api/auth/callback';

  const scopes = 'read_products';

  const installUrl =
    `https://${SHOP}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return res.redirect(302, installUrl);
}
