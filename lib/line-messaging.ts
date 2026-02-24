// LINE Messaging API client for push notifications
// Each store has its own LINE Official Account with its own token

import { supabase } from '@/lib/supabase';

const MESSAGING_API_BASE = 'https://api.line.me/v2/bot';

interface LineMessage {
  type: string;
  [key: string]: any;
}

// Get a store's LINE Channel Access Token from Supabase
export async function getStoreLineToken(storeId: string): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('stores')
    .select('line_channel_access_token')
    .eq('id', storeId)
    .single();

  if (error || !data?.line_channel_access_token) return null;
  return data.line_channel_access_token;
}

// Send push message to a single user using the store's token
export async function pushMessage(
  storeId: string,
  lineUserId: string,
  messages: LineMessage[]
): Promise<boolean> {
  const token = await getStoreLineToken(storeId);
  if (!token) {
    console.error(`No LINE token configured for store: ${storeId}`);
    return false;
  }

  try {
    const res = await fetch(`${MESSAGING_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: messages.slice(0, 5),
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error('LINE push failed:', res.status, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('LINE push error:', error);
    return false;
  }
}

// Send multicast message to multiple users (max 500) using the store's token
export async function multicastMessage(
  storeId: string,
  lineUserIds: string[],
  messages: LineMessage[]
): Promise<boolean> {
  if (lineUserIds.length === 0) return true;

  const token = await getStoreLineToken(storeId);
  if (!token) {
    console.error(`No LINE token configured for store: ${storeId}`);
    return false;
  }

  try {
    const res = await fetch(`${MESSAGING_API_BASE}/message/multicast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserIds.slice(0, 500),
        messages: messages.slice(0, 5),
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error('LINE multicast failed:', res.status, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('LINE multicast error:', error);
    return false;
  }
}

// Simple text message
export function textMessage(text: string): LineMessage {
  return { type: 'text', text };
}

// Flex Message (rich interactive message)
export function flexMessage(altText: string, contents: any): LineMessage {
  return {
    type: 'flex',
    altText,
    contents,
  };
}
