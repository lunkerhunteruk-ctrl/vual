// LINE Flex Message templates for push notifications
import { flexMessage, textMessage } from '@/lib/line-messaging';

// Order confirmation notification
export function orderConfirmationMessage(order: {
  orderId: string;
  total: number;
  itemCount: number;
  customerName?: string;
}) {
  return flexMessage(`注文確認: ¥${order.total.toLocaleString()}`, {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'ご注文ありがとうございます',
          weight: 'bold',
          size: 'md',
          color: '#1DB446',
        },
      ],
      paddingAll: '15px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `注文番号: ${order.orderId.slice(0, 8)}`,
          size: 'sm',
          color: '#666666',
        },
        {
          type: 'separator',
          margin: 'md',
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            { type: 'text', text: '商品数', size: 'sm', color: '#999999', flex: 1 },
            { type: 'text', text: `${order.itemCount}点`, size: 'sm', align: 'end', flex: 1 },
          ],
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'sm',
          contents: [
            { type: 'text', text: '合計', size: 'md', weight: 'bold', flex: 1 },
            { type: 'text', text: `¥${order.total.toLocaleString()}`, size: 'md', weight: 'bold', align: 'end', flex: 1 },
          ],
        },
      ],
      paddingAll: '15px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '注文詳細を見る',
            uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vual.jp'}/ja/orders/${order.orderId}`,
          },
          style: 'primary',
          color: '#6366f1',
        },
      ],
      paddingAll: '15px',
    },
  });
}

// Shipping notification
export function shippingNotificationMessage(order: {
  orderId: string;
  trackingNumber?: string;
}) {
  return flexMessage('商品が発送されました', {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '📦 商品が発送されました',
          weight: 'bold',
          size: 'md',
        },
        {
          type: 'text',
          text: `注文番号: ${order.orderId.slice(0, 8)}`,
          size: 'sm',
          color: '#666666',
          margin: 'md',
        },
        ...(order.trackingNumber
          ? [
              {
                type: 'text' as const,
                text: `追跡番号: ${order.trackingNumber}`,
                size: 'sm' as const,
                color: '#666666',
                margin: 'sm' as const,
              },
            ]
          : []),
      ],
      paddingAll: '15px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '注文詳細を見る',
            uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vual.jp'}/ja/orders/${order.orderId}`,
          },
          style: 'primary',
          color: '#6366f1',
        },
      ],
      paddingAll: '15px',
    },
  });
}

// Live stream start notification
export function liveStreamStartMessage(stream: {
  title: string;
  streamId: string;
  baseUrl?: string;
}) {
  const base = stream.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://vual.jp';
  return flexMessage(`ライブ配信が始まりました: ${stream.title}`, {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '🔴 LIVE',
              weight: 'bold',
              size: 'sm',
              color: '#FF0000',
            },
          ],
        },
        {
          type: 'text',
          text: stream.title,
          weight: 'bold',
          size: 'lg',
          margin: 'md',
          wrap: true,
        },
        {
          type: 'text',
          text: 'ライブ配信が始まりました！今すぐ視聴しましょう。',
          size: 'sm',
          color: '#666666',
          margin: 'md',
          wrap: true,
        },
      ],
      paddingAll: '15px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '視聴する',
            uri: `${base}/ja/live/${stream.streamId}`,
          },
          style: 'primary',
          color: '#EF4444',
        },
      ],
      paddingAll: '15px',
    },
  });
}

// New product notification
export function newProductMessage(product: {
  name: string;
  price: number;
  imageUrl?: string;
  productId: string;
}) {
  return flexMessage(`新商品: ${product.name}`, {
    type: 'bubble',
    ...(product.imageUrl
      ? {
          hero: {
            type: 'image',
            url: product.imageUrl,
            size: 'full',
            aspectRatio: '3:4',
            aspectMode: 'cover',
          },
        }
      : {}),
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '✨ 新商品入荷',
          size: 'sm',
          color: '#6366f1',
          weight: 'bold',
        },
        {
          type: 'text',
          text: product.name,
          weight: 'bold',
          size: 'md',
          margin: 'sm',
          wrap: true,
        },
        {
          type: 'text',
          text: `¥${product.price.toLocaleString()}`,
          size: 'lg',
          weight: 'bold',
          margin: 'md',
        },
      ],
      paddingAll: '15px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '商品を見る',
            uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vual.jp'}/ja/product/${product.productId}`,
          },
          style: 'primary',
          color: '#6366f1',
        },
      ],
      paddingAll: '15px',
    },
  });
}

// Try-on result ready notification
export function tryOnResultMessage() {
  return textMessage(
    '👗 バーチャル試着の結果が完了しました！\nアプリで結果を確認してみましょう。'
  );
}

// Sale / promotion notification
export function promotionMessage(promo: {
  title: string;
  description: string;
  url?: string;
}) {
  return flexMessage(promo.title, {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🎉 セール情報',
          size: 'sm',
          color: '#FF6B6B',
          weight: 'bold',
        },
        {
          type: 'text',
          text: promo.title,
          weight: 'bold',
          size: 'lg',
          margin: 'sm',
          wrap: true,
        },
        {
          type: 'text',
          text: promo.description,
          size: 'sm',
          color: '#666666',
          margin: 'md',
          wrap: true,
        },
      ],
      paddingAll: '15px',
    },
    ...(promo.url
      ? {
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: '詳しく見る',
                  uri: promo.url,
                },
                style: 'primary',
                color: '#6366f1',
              },
            ],
            paddingAll: '15px',
          },
        }
      : {}),
  });
}
