-- Migration: Add support for Yalidine Account 2 and order account tracking

-- 1. Optional dedicated columns on store_settings for Account 2
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS yalidine_api_id_2 text;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS yalidine_api_token_2 text;

-- 2. Optional column on orders to track which account was used ('1' or '2')
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS yalidine_account text DEFAULT '1';
