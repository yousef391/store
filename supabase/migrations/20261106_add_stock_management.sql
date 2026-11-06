-- Migration: Add stock management with sizes and stock deduction tracking

-- 1. Add size_stock JSONB column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_stock jsonb DEFAULT '{}'::jsonb;

-- 2. Add stock_deducted flag to orders table to prevent duplicate deductions
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_deducted boolean DEFAULT false;

-- 3. Create stock_logs table for audit trail of every stock change
CREATE TABLE IF NOT EXISTS public.stock_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id int,
  product_name text NOT NULL,
  size text NOT NULL,
  change int NOT NULL,
  previous_stock int,
  new_stock int,
  reason text NOT NULL,
  order_id uuid,
  order_number int,
  user_email text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_stock_logs_product_id ON public.stock_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_created_at ON public.stock_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read stock_logs"
  ON public.stock_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert stock_logs"
  ON public.stock_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon insert stock_logs"
  ON public.stock_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon read stock_logs"
  ON public.stock_logs FOR SELECT
  TO anon
  USING (true);
