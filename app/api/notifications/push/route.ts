import { NextRequest, NextResponse } from 'next/server';
import { pushMessage, multicastMessage } from '@/lib/line-messaging';
import {
  orderConfirmationMessage,
  shippingNotificationMessage,
  liveStreamStartMessage,
  newProductMessage,
  tryOnResultMessage,
  promotionMessage,
} from '@/lib/notifications/templates';

import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

type NotificationType =
  | 'order_confirmation'
  | 'shipping'
  | 'live_start'
  | 'new_product'
  | 'tryon_result'
  | 'promotion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, storeId, lineUserIds, data } = body as {
      type: NotificationType;
      storeId?: string;
      lineUserIds: string | string[];
      data: any;
    };

    if (!type || !lineUserIds) {
      return NextResponse.json(
        { error: 'type and lineUserIds are required' },
        { status: 400 }
      );
    }

    const targetStoreId = storeId || await resolveStoreIdFromRequest(request);

    // Build message based on type
    let message;
    switch (type) {
      case 'order_confirmation':
        message = orderConfirmationMessage(data);
        break;
      case 'shipping':
        message = shippingNotificationMessage(data);
        break;
      case 'live_start':
        message = liveStreamStartMessage(data);
        break;
      case 'new_product':
        message = newProductMessage(data);
        break;
      case 'tryon_result':
        message = tryOnResultMessage();
        break;
      case 'promotion':
        message = promotionMessage(data);
        break;
      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    let success: boolean;

    if (Array.isArray(lineUserIds)) {
      success = await multicastMessage(targetStoreId, lineUserIds, [message]);
    } else {
      success = await pushMessage(targetStoreId, lineUserIds, [message]);
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send notification. Check store LINE integration.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Push notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
