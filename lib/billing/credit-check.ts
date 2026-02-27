import { createServerClient } from '@/lib/supabase';

export interface CreditCheckResult {
  allowed: boolean;
  creditSource: 'store_b2b' | 'consumer_free' | 'consumer_paid' | 'consumer_subscription' | null;
  creditTransactionId: string | null;
  error?: string;
  errorCode?: 'NO_CREDITS' | 'NO_STORE_CREDITS' | 'DAILY_LIMIT_EXCEEDED' | 'AUTH_REQUIRED' | 'DB_ERROR';
  dailyLimit?: number;
}

export async function checkAndDeductCredit(params: {
  storeId?: string;
  productId?: string;
  lineUserId?: string;
  customerId?: string;
  vtonQueueId?: string;
}): Promise<CreditCheckResult> {
  const supabase = createServerClient();
  if (!supabase) {
    return { allowed: false, creditSource: null, creditTransactionId: null, error: 'Database not configured', errorCode: 'DB_ERROR' };
  }

  const { storeId, productId, lineUserId, customerId, vtonQueueId } = params;

  // ---- B2C: Consumer try-on ----
  if (!lineUserId && !customerId) {
    return {
      allowed: false,
      creditSource: null,
      creditTransactionId: null,
      error: 'ログインが必要です',
      errorCode: 'AUTH_REQUIRED',
    };
  }

  // Resolve the store's daily free limit
  let dailyFreeLimit = 3;
  if (storeId) {
    const { data: storeCreds } = await supabase
      .from('store_credits')
      .select('daily_tryon_limit')
      .eq('store_id', storeId)
      .single();
    dailyFreeLimit = storeCreds?.daily_tryon_limit ?? 3;
  }

  // Find or create consumer_credits
  let consumerCreditId: string | null = null;

  if (lineUserId) {
    const { data } = await supabase
      .from('consumer_credits')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single();
    consumerCreditId = data?.id || null;
  } else if (customerId) {
    const { data } = await supabase
      .from('consumer_credits')
      .select('id')
      .eq('customer_id', customerId)
      .single();
    consumerCreditId = data?.id || null;
  }

  // Auto-create if not exists
  if (!consumerCreditId) {
    // Reset at midnight tomorrow (daily free tickets)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const insertData: Record<string, unknown> = {
      free_tickets_remaining: dailyFreeLimit,
      free_tickets_reset_at: tomorrow.toISOString(),
    };
    if (customerId) insertData.customer_id = customerId;
    if (lineUserId) insertData.line_user_id = lineUserId;

    const { data: newCredits, error: insertError } = await supabase
      .from('consumer_credits')
      .insert(insertData)
      .select('id')
      .single();

    if (insertError || !newCredits) {
      console.error('Failed to create consumer_credits:', insertError);
      return { allowed: false, creditSource: null, creditTransactionId: null, error: 'Failed to initialize credits', errorCode: 'DB_ERROR' };
    }
    consumerCreditId = newCredits.id;
  }

  // Deduct consumer credit (priority: free > subscription > paid)
  // Try with p_free_ticket_limit first (new schema), fall back to old signature
  let data: any;
  let error: any;
  const rpcResult = await supabase.rpc('deduct_consumer_credit', {
    p_consumer_credit_id: consumerCreditId,
    p_vton_queue_id: vtonQueueId || null,
    p_free_ticket_limit: dailyFreeLimit,
  });
  data = rpcResult.data;
  error = rpcResult.error;

  // Fallback: if new param not recognized, retry without it
  if (error && error.message?.includes('p_free_ticket_limit')) {
    const fallback = await supabase.rpc('deduct_consumer_credit', {
      p_consumer_credit_id: consumerCreditId,
      p_vton_queue_id: vtonQueueId || null,
    });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('deduct_consumer_credit RPC error:', error);
    return { allowed: false, creditSource: null, creditTransactionId: null, error: 'Failed to check consumer credits', errorCode: 'DB_ERROR' };
  }

  const result = data?.[0] || data;
  if (!result?.success || result.source === 'none') {
    return {
      allowed: false,
      creditSource: null,
      creditTransactionId: null,
      error: 'クレジットが不足しています。クレジットを購入してください。',
      errorCode: 'NO_CREDITS',
    };
  }

  return {
    allowed: true,
    creditSource: result.source as CreditCheckResult['creditSource'],
    creditTransactionId: result.tx_id,
  };
}
