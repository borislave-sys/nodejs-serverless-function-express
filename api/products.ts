```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SHOPIFY_API_VERSION = '2026-07';

function xmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const shop = process.env.SHOPIFY_STORE;
    const token = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!shop || !token) {
      return res.status(500).json({
        error: 'Shopify environment variables are not configured.'
      });
    }

    const query = `
      query Products($cursor: String) {
        products(first: 100, after: $cursor) {
          edges {
            node {
              id
              title
              handle
              variants(first: 250) {
                nodes {
                  id
                  title
                  sku
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const products: any[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await fetch(
        `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token
          },
          body: JSON.stringify({
            query,
            variables: { cursor }
          })
        }
      );

      const data = await response.json();

      if (!response.ok || data.errors) {
        console.error(data);
        throw new Error('Shopify GraphQL request failed.');
      }

      const connection = data.data.products;

      products.push(...connection.edges.map((edge: any) => edge.node));

      hasNextPage = connection.pageInfo.hasNextPage;
      cursor = connection.pageInfo.endCursor;
    }

    const items: string[] = [];

    for (const product of products) {
      for (const variant of product.variants.nodes) {
        // Skip variants without a SKU
        if (!variant.sku) continue;

        const productUrl =
          `https://${shop}/products/${product.handle}?variant=${variant.id.split('/').pop()}`;

        items.push(`
    <product>
      <id>${xmlEscape(variant.id)}</id>
      <title>${xmlEscape(product.title)}</title>
      <variant>${xmlEscape(variant.title)}</variant>
      <sku>${xmlEscape(variant.sku)}</sku>
      <url>${xmlEscape(productUrl)}</url>
    </product>`);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<products>
  <generated_at>${xmlEscape(new Date().toISOString())}</generated_at>
  <count>${items.length}</count>${items.join('')}
</products>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    return res.status(200).send(xml);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Unable to generate Shopify product feed.'
    });
  }
}
```
