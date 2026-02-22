import liff, { Liff } from '@line/liff';

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '';

let liffObject: Liff | null = null;
let isInitialized = false;

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LiffContext {
  type: 'utou' | 'room' | 'group' | 'square_chat' | 'external' | 'none';
  viewType: 'compact' | 'tall' | 'full' | 'frame' | 'full-flex' | undefined;
  userId?: string;
  utouId?: string;
  roomId?: string;
  groupId?: string;
}

export async function initLiff(): Promise<Liff> {
  if (isInitialized && liffObject) {
    return liffObject;
  }

  if (!LIFF_ID) {
    throw new Error('LIFF ID is not configured');
  }

  try {
    await liff.init({ liffId: LIFF_ID });
    liffObject = liff;
    isInitialized = true;
    return liff;
  } catch (error) {
    console.error('LIFF initialization failed:', error);
    throw error;
  }
}

export function getLiff(): Liff | null {
  return liffObject;
}

export function isLoggedIn(): boolean {
  return liffObject?.isLoggedIn() ?? false;
}

export function login(redirectUri?: string): void {
  if (!liffObject) {
    throw new Error('LIFF is not initialized');
  }
  liffObject.login({ redirectUri });
}

export function logout(): void {
  if (!liffObject) {
    throw new Error('LIFF is not initialized');
  }
  liffObject.logout();
}

export async function getProfile(): Promise<LiffProfile | null> {
  if (!liffObject || !liffObject.isLoggedIn()) {
    return null;
  }

  try {
    const profile = await liffObject.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
  } catch (error) {
    console.error('Failed to get LIFF profile:', error);
    return null;
  }
}

export function getAccessToken(): string | null {
  if (!liffObject) {
    return null;
  }
  return liffObject.getAccessToken();
}

export function getIDToken(): string | null {
  if (!liffObject) {
    return null;
  }
  return liffObject.getIDToken();
}

export function getContext(): LiffContext | null {
  if (!liffObject) {
    return null;
  }
  const context = liffObject.getContext();
  if (!context) {
    return null;
  }
  return {
    type: context.type,
    viewType: context.viewType,
    userId: context.userId,
    utouId: context.utouId,
    roomId: context.roomId,
    groupId: context.groupId,
  };
}

export function isInClient(): boolean {
  return liffObject?.isInClient() ?? false;
}

export function closeWindow(): void {
  if (liffObject?.isInClient()) {
    liffObject.closeWindow();
  }
}

interface TextMessage {
  type: 'text';
  text: string;
}

export async function sendMessages(messages: TextMessage[]): Promise<void> {
  if (!liffObject || !liffObject.isInClient()) {
    throw new Error('Cannot send messages outside of LINE app');
  }
  await liffObject.sendMessages(messages);
}

export async function shareTargetPicker(messages: TextMessage[]): Promise<void> {
  if (!liffObject) {
    throw new Error('LIFF is not initialized');
  }

  if (!liffObject.isApiAvailable('shareTargetPicker')) {
    throw new Error('Share Target Picker is not available');
  }

  await liffObject.shareTargetPicker(messages);
}

// Open external URL
export function openWindow(url: string, external: boolean = false): void {
  if (!liffObject) {
    window.open(url, '_blank');
    return;
  }
  liffObject.openWindow({ url, external });
}
