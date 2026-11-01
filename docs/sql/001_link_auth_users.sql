-- =====================================================================
-- Giggles & Kurls: link Supabase Auth users to employee / client rows
-- Idempotent. Already applied to the live project; keep for new environments.
-- Run in Supabase Dashboard → SQL Editor.
-- =====================================================================

-- 1. Link columns → auth.users (deleting an auth user just unlinks the row)
ALTER TABLE public.employee ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.client   ADD COLUMN IF NOT EXISTS auth_user_id UUID;

ALTER TABLE public.employee DROP CONSTRAINT IF EXISTS employee_auth_user_id_fkey;
ALTER TABLE public.employee ADD CONSTRAINT employee_auth_user_id_fkey
  FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.client DROP CONSTRAINT IF EXISTS client_auth_user_id_fkey;
ALTER TABLE public.client ADD CONSTRAINT client_auth_user_id_fkey
  FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- One login ↔ at most one row per table
CREATE UNIQUE INDEX IF NOT EXISTS employee_auth_user_id_key
  ON public.employee (auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS client_auth_user_id_key
  ON public.client (auth_user_id) WHERE auth_user_id IS NOT NULL;

-- 2. Sign-up trigger: create a NEW client profile from the sign-up form.
--    It never links to an existing client or employee automatically: phone
--    numbers aren't verified, and email-based staff linking would hand out the
--    manager role to anyone if email confirmation were ever turned off.
--    If the phone/email is already on file, no row is created and the user
--    sees "Account not linked yet" until staff link them (step 3).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_phone text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', new.phone, '')), '');
BEGIN
  IF v_phone IS NOT NULL THEN
    INSERT INTO public.client (auth_user_id, phone, email, full_name)
    VALUES (new.id, v_phone, new.email, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Manual linking (run after the person has signed up at /login)
--
-- Staff / manager: role comes from employee.role
-- UPDATE public.employee
--   SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'manager@gigglesandcurls.co.za')
--   WHERE id = '11111111-1111-1111-1111-111111111111';
--
-- Existing client whose phone was already on file (no profile was auto-created):
-- UPDATE public.client
--   SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'client@example.com')
--   WHERE id = '11111111-1111-1111-1111-111111111101';
