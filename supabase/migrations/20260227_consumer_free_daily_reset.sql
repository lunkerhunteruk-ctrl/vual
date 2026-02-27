-- Fix deduct_consumer_credit: reset free tickets DAILY instead of monthly.
-- The free ticket limit is the store's daily_tryon_limit (passed as p_free_ticket_limit).
-- reset_at is set to tomorrow midnight so tickets reset every day.

CREATE OR REPLACE FUNCTION deduct_consumer_credit(
  p_consumer_credit_id UUID,
  p_vton_queue_id UUID DEFAULT NULL,
  p_free_ticket_limit INTEGER DEFAULT 3
)
RETURNS TABLE (success BOOLEAN, source TEXT, tx_id UUID) AS $$
DECLARE
  v_rec consumer_credits%ROWTYPE;
  v_tx_id UUID;
BEGIN
  SELECT * INTO v_rec
  FROM consumer_credits
  WHERE id = p_consumer_credit_id
  FOR UPDATE;

  IF v_rec IS NULL THEN
    RETURN QUERY SELECT false, 'none'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Auto-reset free tickets DAILY (when reset_at has passed)
  IF v_rec.free_tickets_reset_at <= NOW() THEN
    v_rec.free_tickets_remaining := p_free_ticket_limit;
    -- Next reset = tomorrow at midnight (JST-aware: use date arithmetic)
    v_rec.free_tickets_reset_at := DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Tokyo') + INTERVAL '1 day';

    UPDATE consumer_credits SET
      free_tickets_remaining = v_rec.free_tickets_remaining,
      free_tickets_reset_at = v_rec.free_tickets_reset_at
    WHERE id = p_consumer_credit_id;
  END IF;

  -- Try free tickets first
  IF v_rec.free_tickets_remaining > 0 THEN
    UPDATE consumer_credits SET
      free_tickets_remaining = v_rec.free_tickets_remaining - 1,
      updated_at = NOW()
    WHERE id = p_consumer_credit_id;

    INSERT INTO consumer_credit_transactions (consumer_credit_id, type, amount, description, vton_queue_id)
    VALUES (p_consumer_credit_id, 'free_ticket_use', -1, '無料チケット使用', p_vton_queue_id)
    RETURNING id INTO v_tx_id;

    RETURN QUERY SELECT true, 'consumer_free'::TEXT, v_tx_id;
    RETURN;
  END IF;

  -- Try subscription credits
  IF v_rec.subscription_credits > 0 THEN
    UPDATE consumer_credits SET
      subscription_credits = v_rec.subscription_credits - 1,
      updated_at = NOW()
    WHERE id = p_consumer_credit_id;

    INSERT INTO consumer_credit_transactions (consumer_credit_id, type, amount, description, vton_queue_id)
    VALUES (p_consumer_credit_id, 'subscription_credit_use', -1, 'VUAL Pass クレジット使用', p_vton_queue_id)
    RETURNING id INTO v_tx_id;

    RETURN QUERY SELECT true, 'consumer_subscription'::TEXT, v_tx_id;
    RETURN;
  END IF;

  -- Try paid credits
  IF v_rec.paid_credits > 0 THEN
    UPDATE consumer_credits SET
      paid_credits = v_rec.paid_credits - 1,
      updated_at = NOW()
    WHERE id = p_consumer_credit_id;

    INSERT INTO consumer_credit_transactions (consumer_credit_id, type, amount, description, vton_queue_id)
    VALUES (p_consumer_credit_id, 'paid_credit_use', -1, 'クレジット使用', p_vton_queue_id)
    RETURNING id INTO v_tx_id;

    RETURN QUERY SELECT true, 'consumer_paid'::TEXT, v_tx_id;
    RETURN;
  END IF;

  -- No credits available
  RETURN QUERY SELECT false, 'none'::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql;
