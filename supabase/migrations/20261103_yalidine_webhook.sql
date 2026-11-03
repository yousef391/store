-- Migration: Add Yalidine delivery statuses & index for fast webhook lookups

-- 1. Index on tracking_id for instantaneous webhook lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON public.orders(tracking_id);

-- 2. Expand status check constraint to support all e-commerce delivery lifecycle statuses
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'new',
    'confirmed',
    'cancelled',
    'recall',
    'recall_1',
    'recall_2',
    'recall_3',
    'recall_4',
    'recall_5',
    'expedie',
    'en_livraison',
    'livre',
    'retourne',
    'echoue'
  )
);

-- 3. Stored function in Supabase to process a Yalidine status update
CREATE OR REPLACE FUNCTION public.handle_yalidine_webhook_event(
  p_tracking text,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number int;
  v_order_name text;
  v_existing_note text;
  v_mapped_status text;
  v_action text;
  v_lower text;
BEGIN
  v_lower := lower(trim(p_status));

  -- Status mapping
  -- 1. Sorti en livraison / Prêt pour livreur -> en_livraison (NOT livré!)
  IF v_lower LIKE '%livreur%' OR v_lower LIKE '%sorti en livraison%' OR v_lower LIKE '%en cours de livraison%' OR v_lower LIKE '%en livraison%' THEN
    v_mapped_status := 'en_livraison';
    v_action := 'order_shipped';
  -- 2. Retours et Échecs de livraison -> retourne
  ELSIF v_lower LIKE '%retour%' OR v_lower LIKE '%returned%' OR v_lower LIKE '%echèc%' OR v_lower LIKE '%échec%' OR v_lower LIKE '%echec%' OR v_lower LIKE '%abandonné%' THEN
    v_mapped_status := 'retourne';
    v_action := 'order_returned';
  -- 3. Livré réel
  ELSIF v_lower LIKE 'livré%' OR v_lower LIKE 'livre%' OR v_lower LIKE '%livré payé%' OR v_lower LIKE '%delivered%' THEN
    v_mapped_status := 'livre';
    v_action := 'order_delivered';
  -- 4. Alertes / Tentatives temporaires
  ELSIF v_lower LIKE '%tentative%' OR v_lower LIKE '%alerte%' OR v_lower LIKE '%attente%' OR v_lower LIKE '%injoignable%' THEN
    v_mapped_status := 'echoue';
    v_action := 'order_failed';
  ELSE
    v_mapped_status := 'expedie';
    v_action := 'order_shipped';
  END IF;

  -- Find order by tracking_id
  SELECT id, order_number, name, note
  INTO v_order_id, v_order_number, v_order_name, v_existing_note
  FROM public.orders
  WHERE tracking_id = p_tracking
  LIMIT 1;

  IF v_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found for tracking: ' || p_tracking);
  END IF;

  -- Update order status
  UPDATE public.orders
  SET 
    status = v_mapped_status,
    updated_at = now(),
    note = CASE 
      WHEN p_reason IS NOT NULL AND length(trim(p_reason)) > 0 THEN 
        COALESCE(v_existing_note || ' | ', '') || '[Yalidine: ' || p_status || ' - ' || p_reason || ']'
      ELSE note
    END
  WHERE id = v_order_id;

  -- Record in activity history
  INSERT INTO public.histories (action, description, "user", details, "timestamp")
  VALUES (
    v_action,
    'Commande #' || v_order_number || ' : statut Yalidine mis à jour vers "' || p_status || '" (' || v_order_name || ')',
    'Yalidine Webhook',
    jsonb_build_object('tracking', p_tracking, 'raw_status', p_status, 'mapped_status', v_mapped_status, 'reason', p_reason)::text,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'status', v_mapped_status
  );
END;
$$;

