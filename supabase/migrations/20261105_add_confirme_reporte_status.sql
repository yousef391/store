-- Migration: Add 'confirme_reporte' status to orders_status_check constraint
-- Enables tracking confirmed orders with delayed/postponed dispatch.

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'new',
    'confirmed',
    'confirme_reporte',
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
