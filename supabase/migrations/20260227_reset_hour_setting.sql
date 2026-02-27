-- Add configurable reset hour to store_credits
-- Allows store admins to choose what hour (JST) free tickets reset daily
ALTER TABLE store_credits ADD COLUMN IF NOT EXISTS free_reset_hour INTEGER NOT NULL DEFAULT 0;

-- Update deduct_consumer_credit to accept reset hour
CREATE OR REPLACE FUNCTION deduct_consumer_credit(
  p_consumer_credit_id UUID,
  p_vton_queue_id UUID DEFAULT NULL,
  p_free_ticket_limit INTEGER DEFAULT 3,
  p_reset_hour INTEGER DEFAULT 0
)
RETURNS TABLE (success BOOLEAN, source TEXT, tx_id UUID) AS $$
DECLARE
  v_rec consumer_credits%ROWTYPE;
  v_tx_id UUID;
  v_now_jst TIMESTAMPTZ;
  v_today_reset TIMESTAMPTZ;
  v_next_reset TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_rec
  FROM consumer_credits
  WHERE id = p_consumer_credit_id
  FOR UPDATE;

  IF v_rec IS NULL THEN
    RETURN QUERY SELECT false, 'none'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Calculate today's reset time in JST
  v_now_jst := NOW() AT TIME ZONE 'Asia/Tokyo';
  v_today_reset := (DATE_TRUNC('day', v_now_jst) + (p_reset_hour || ' hours')::INTERVAL) AT TIME ZONE 'Asia/Tokyo';

  -- If we haven't passed today's reset time yet, the next reset is today's reset time
  -- If we have passed it, the next reset is tomorrow's reset time
  IF v_now_jst >= v_today_reset THEN
    v_next_reset := v_today_reset + INTERVAL '1 day';
  ELSE
    v_next_reset := v_today_reset;
  END IF;

  -- Auto-reset free tickets if reset_at has passed
  IF v_rec.free_tickets_reset_at <= NOW() THEN
    v_rec.free_tickets_remaining := p_free_ticket_limit;
    v_rec.free_tickets_reset_at := v_next_reset;

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
