-- =====================================================================
-- Giggles & Kurls: Row Level Security + secured RPCs
-- Run once in Supabase Dashboard → SQL Editor (runs as one transaction).
-- Requires 001_link_auth_users.sql (auth_user_id columns) to be applied.
--
-- Model
--   • anon (not signed in): no table or RPC access at all.
--   • Reads: RLS policies per role (client / employee / manager).
--   • Writes: ONLY through RPCs. The RPCs are SECURITY DEFINER and check
--     auth.uid() themselves, so every p_*_id argument must match the caller.
--     Only exception: clients insert their own tech ratings directly.
--   • Function signatures are unchanged, so the app needs no code changes.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Identity helpers (private schema = not callable through the API)
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- SECURITY DEFINER so policies can call them without recursing into RLS.
CREATE OR REPLACE FUNCTION private.current_client_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.id FROM public.client c
  WHERE c.auth_user_id = auth.uid() AND c.anonymised_at IS NULL
$$;

CREATE OR REPLACE FUNCTION private.current_employee_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT e.id FROM public.employee e
  WHERE e.auth_user_id = auth.uid() AND e.is_active
$$;

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employee e
    WHERE e.auth_user_id = auth.uid() AND e.is_active
  )
$$;

CREATE OR REPLACE FUNCTION private.is_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employee e
    WHERE e.auth_user_id = auth.uid() AND e.is_active AND e.role = 'manager'
  )
$$;

-- Raises unless the caller is signed in as the active manager p_manager_id.
CREATE OR REPLACE FUNCTION private.assert_manager(p_manager_id uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employee e
    WHERE e.id = p_manager_id AND e.auth_user_id = auth.uid()
      AND e.is_active AND e.role = 'manager'
  ) THEN
    RAISE EXCEPTION 'Only a signed-in manager can do this.' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Raises unless the caller is signed in as the active employee p_employee_id.
CREATE OR REPLACE FUNCTION private.assert_employee(p_employee_id uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_employee_id IS NULL OR p_employee_id IS DISTINCT FROM private.current_employee_id() THEN
    RAISE EXCEPTION 'Only signed-in staff can do this.' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_client_id(), private.current_employee_id(),
  private.is_staff(), private.is_manager() TO authenticated;
-- assert_* are only called from inside the RPCs (which run as the owner).

-- ---------------------------------------------------------------------
-- 2. Table privileges: no anon access, read-only for signed-in users
-- ---------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.audit_log_id_seq FROM anon, authenticated;

GRANT SELECT ON public.client, public.service, public.loyalty_config, public.visit,
  public.service_line, public.discount_code, public.voucher, public.audit_log,
  public.rating, public.consent_record TO authenticated;

-- Staff names are visible to signed-in users (e.g. "with Sarah" on a bill);
-- staff phone/email are not.
GRANT SELECT (id, full_name, role, is_active, auth_user_id) ON public.employee TO authenticated;

-- The only direct writes from the app.
GRANT INSERT (visit_id, service_line_id, serviced_by_employee_id, score, comment)
  ON public.rating TO authenticated;
GRANT INSERT (client_id, doc_type, doc_version, ip_or_device)
  ON public.consent_record TO authenticated;

-- service_role (trusted server code / dashboard) keeps full access.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ---------------------------------------------------------------------
-- 3. Enable RLS on every table
-- ---------------------------------------------------------------------
ALTER TABLE public.audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_code  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_line   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher        ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 4. Policies (all TO authenticated; anon has no policies)
-- ---------------------------------------------------------------------

-- visit: clients → own; staff → open visits + ones they rang up; managers → all
DROP POLICY IF EXISTS visit_select ON public.visit;
CREATE POLICY visit_select ON public.visit FOR SELECT TO authenticated USING (
  client_id = (SELECT private.current_client_id())
  OR (SELECT private.is_manager())
  OR (
    (SELECT private.is_staff())
    AND (
      status IN ('checked_in', 'in_service', 'awaiting_checkout_scan', 'flagged_stale')
      -- lets the till see "Paid & checked out!" after the client pays
      OR created_by_employee_id = (SELECT private.current_employee_id())
    )
  )
);

-- service_line: visible exactly when its visit is visible (visit RLS applies)
DROP POLICY IF EXISTS service_line_select ON public.service_line;
CREATE POLICY service_line_select ON public.service_line FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.visit v WHERE v.id = service_line.visit_id)
);

-- client: own row; staff → clients with an open visit (the queue); managers → all
DROP POLICY IF EXISTS client_select ON public.client;
CREATE POLICY client_select ON public.client FOR SELECT TO authenticated USING (
  auth_user_id = (SELECT auth.uid())
  OR (SELECT private.is_manager())
  OR (
    (SELECT private.is_staff())
    AND EXISTS (
      SELECT 1 FROM public.visit v
      WHERE v.client_id = client.id
        AND v.status IN ('checked_in', 'in_service', 'awaiting_checkout_scan', 'flagged_stale')
    )
  )
);

-- employee: directory of names/roles (sensitive columns are not granted)
DROP POLICY IF EXISTS employee_select ON public.employee;
CREATE POLICY employee_select ON public.employee FOR SELECT TO authenticated USING (true);

-- service / loyalty_config: menu + loyalty rules are readable by signed-in users
DROP POLICY IF EXISTS service_select ON public.service;
CREATE POLICY service_select ON public.service FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS loyalty_config_select ON public.loyalty_config;
CREATE POLICY loyalty_config_select ON public.loyalty_config FOR SELECT TO authenticated USING (true);

-- discount_code: own rewards; managers → all
DROP POLICY IF EXISTS discount_code_select ON public.discount_code;
CREATE POLICY discount_code_select ON public.discount_code FOR SELECT TO authenticated USING (
  client_id = (SELECT private.current_client_id()) OR (SELECT private.is_manager())
);

-- voucher: own vouchers; managers → all
DROP POLICY IF EXISTS voucher_select ON public.voucher;
CREATE POLICY voucher_select ON public.voucher FOR SELECT TO authenticated USING (
  issued_to_client_id = (SELECT private.current_client_id()) OR (SELECT private.is_manager())
);

-- consent_record: own records (and can record own consent); managers → all
DROP POLICY IF EXISTS consent_record_select ON public.consent_record;
CREATE POLICY consent_record_select ON public.consent_record FOR SELECT TO authenticated USING (
  client_id = (SELECT private.current_client_id()) OR (SELECT private.is_manager())
);

DROP POLICY IF EXISTS consent_record_insert ON public.consent_record;
CREATE POLICY consent_record_insert ON public.consent_record FOR INSERT TO authenticated WITH CHECK (
  client_id = (SELECT private.current_client_id())
);

-- rating: clients rate lines on their own completed visits, for the tech who
-- actually did the line; staff see their own visible ratings; managers → all
DROP POLICY IF EXISTS rating_select ON public.rating;
CREATE POLICY rating_select ON public.rating FOR SELECT TO authenticated USING (
  (SELECT private.is_manager())
  OR EXISTS (
    SELECT 1 FROM public.visit v
    WHERE v.id = rating.visit_id AND v.client_id = (SELECT private.current_client_id())
  )
  OR (
    serviced_by_employee_id = (SELECT private.current_employee_id())
    AND hidden_by_employee_id IS NULL
  )
);

DROP POLICY IF EXISTS rating_insert ON public.rating;
CREATE POLICY rating_insert ON public.rating FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.service_line sl
    JOIN public.visit v ON v.id = sl.visit_id
    WHERE sl.id = rating.service_line_id
      AND sl.visit_id = rating.visit_id
      AND sl.serviced_by_employee_id = rating.serviced_by_employee_id
      AND sl.status = 'active'
      AND v.client_id = (SELECT private.current_client_id())
      AND v.status IN ('completed', 'completed_override')
  )
);

-- audit_log: managers only
DROP POLICY IF EXISTS audit_log_select ON public.audit_log;
CREATE POLICY audit_log_select ON public.audit_log FOR SELECT TO authenticated USING (
  (SELECT private.is_manager())
);

-- ---------------------------------------------------------------------
-- 5. RPCs: SECURITY DEFINER + caller checks against auth.uid()
--    (same names, arguments and return types as before)
-- ---------------------------------------------------------------------

-- Internal: not callable from the API (see grants below).
CREATE OR REPLACE FUNCTION public.rpc_issue_reward(p_visit_id uuid, p_client_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_visits_per_reward INT;
  v_reward_value DECIMAL(10,2);
  v_expiry_days INT;
  v_completed_visits INT;
  v_existing_rewards INT;
BEGIN
  SELECT visits_per_reward, reward_value, reward_expiry_days
    INTO v_visits_per_reward, v_reward_value, v_expiry_days
  FROM public.loyalty_config WHERE is_active = true LIMIT 1;
  IF v_visits_per_reward IS NULL THEN RAISE EXCEPTION 'No active loyalty config.'; END IF;

  SELECT COUNT(*) INTO v_completed_visits FROM public.visit
  WHERE client_id = p_client_id AND status IN ('completed', 'completed_override') AND voided_at IS NULL;

  SELECT COUNT(*) INTO v_existing_rewards FROM public.discount_code
  WHERE client_id = p_client_id AND type = 'loyalty' AND status IN ('issued', 'redeemed');

  IF (v_completed_visits / v_visits_per_reward) > v_existing_rewards THEN
    INSERT INTO public.discount_code (client_id, code, type, value, status, expires_at, earned_visit_id)
    VALUES (p_client_id, 'LOY-' || upper(substr(md5(random()::text), 1, 8)), 'loyalty', v_reward_value,
            'issued', NOW() + (v_expiry_days || ' days')::INTERVAL, p_visit_id);

    INSERT INTO public.audit_log (entity_type, entity_id, action, actor_role)
    VALUES ('client', p_client_id, 'loyalty_reward_issued', 'system');
  END IF;
END;
$$;

-- Client: check in (caller must BE p_client_id)
CREATE OR REPLACE FUNCTION public.rpc_start_visit(p_client_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_visit_id UUID;
BEGIN
  IF p_client_id IS NULL OR p_client_id IS DISTINCT FROM private.current_client_id() THEN
    RAISE EXCEPTION 'You can only check yourself in.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.visit
    WHERE client_id = p_client_id
      AND status IN ('checked_in', 'in_service', 'awaiting_checkout_scan', 'flagged_stale')
  ) THEN
    RAISE EXCEPTION 'Client already has an open visit.';
  END IF;

  INSERT INTO public.visit (client_id, status) VALUES (p_client_id, 'checked_in') RETURNING id INTO v_visit_id;
  INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, actor_role)
  VALUES ('visit', v_visit_id, 'checked_in', p_client_id, 'client');
  RETURN v_visit_id;
END;
$$;

-- Staff: add a service (caller must BE p_employee_id; tech must be active staff)
CREATE OR REPLACE FUNCTION public.rpc_add_service_line(p_visit_id uuid, p_service_id uuid, p_tech_id uuid, p_employee_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_price DECIMAL(10,2);
  v_line_id UUID;
  v_status TEXT;
BEGIN
  PERFORM private.assert_employee(p_employee_id);

  IF NOT EXISTS (SELECT 1 FROM public.employee WHERE id = p_tech_id AND is_active) THEN
    RAISE EXCEPTION 'Nail tech not found or inactive.';
  END IF;

  SELECT status INTO v_status FROM public.visit WHERE id = p_visit_id FOR UPDATE;
  IF v_status IS NULL OR v_status NOT IN ('checked_in', 'in_service') THEN
    RAISE EXCEPTION 'Visit is not open for services.';
  END IF;

  SELECT price INTO v_price FROM public.service WHERE id = p_service_id AND is_active = true;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Service not found or inactive.'; END IF;

  INSERT INTO public.service_line (visit_id, service_id, serviced_by_employee_id, price, status)
  VALUES (p_visit_id, p_service_id, p_tech_id, v_price, 'active') RETURNING id INTO v_line_id;

  IF v_status = 'checked_in' THEN
    UPDATE public.visit SET status = 'in_service', created_by_employee_id = p_employee_id WHERE id = p_visit_id;
  END IF;

  INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, actor_role)
  VALUES ('service_line', v_line_id, 'added', p_employee_id, 'employee');
  RETURN v_line_id;
END;
$$;

-- Staff: complete visit + issue checkout QR token (only for open visits)
CREATE OR REPLACE FUNCTION public.rpc_employee_complete_visit(p_visit_id uuid, p_employee_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_token TEXT;
  v_total DECIMAL(10,2);
  v_status TEXT;
BEGIN
  PERFORM private.assert_employee(p_employee_id);

  SELECT status INTO v_status FROM public.visit WHERE id = p_visit_id FOR UPDATE;
  IF v_status IS NULL OR v_status NOT IN ('checked_in', 'in_service') THEN
    RAISE EXCEPTION 'Visit is not open, so it cannot be completed.';
  END IF;

  SELECT COALESCE(SUM(price - discount_amount), 0) INTO v_total
  FROM public.service_line WHERE visit_id = p_visit_id AND status = 'active';
  IF v_total = 0 THEN RAISE EXCEPTION 'Cannot complete a visit with no active service lines.'; END IF;

  v_token := md5(random()::text || clock_timestamp()::text);

  UPDATE public.visit
  SET status = 'awaiting_checkout_scan', checkout_qr_token = v_token,
      qr_expires_at = NOW() + INTERVAL '5 minutes', total = v_total
  WHERE id = p_visit_id;

  INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, actor_role)
  VALUES ('visit', p_visit_id, 'awaiting_checkout_scan', p_employee_id, 'employee');
  RETURN v_token;
END;
$$;

-- Client: pay via QR (caller must BE p_client_id; can't pay less than the bill)
CREATE OR REPLACE FUNCTION public.rpc_checkout_complete(p_visit_id uuid, p_client_id uuid, p_token text, p_amount_paid numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_client_id UUID;
  v_status TEXT;
  v_expires TIMESTAMPTZ;
  v_total DECIMAL(10,2);
BEGIN
  IF p_client_id IS NULL OR p_client_id IS DISTINCT FROM private.current_client_id() THEN
    RAISE EXCEPTION 'QR does not belong to this client.' USING ERRCODE = '42501';
  END IF;

  SELECT client_id, status, qr_expires_at, total INTO v_client_id, v_status, v_expires, v_total
  FROM public.visit WHERE id = p_visit_id AND checkout_qr_token = p_token FOR UPDATE;

  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid visit or QR token.'; END IF;
  IF v_client_id <> p_client_id THEN RAISE EXCEPTION 'QR does not belong to this client.'; END IF;
  IF v_status <> 'awaiting_checkout_scan' THEN RAISE EXCEPTION 'Visit is not awaiting checkout.'; END IF;
  IF v_expires < NOW() THEN RAISE EXCEPTION 'QR has expired.'; END IF;
  IF p_amount_paid IS NULL OR p_amount_paid < v_total THEN
    RAISE EXCEPTION 'Amount paid is less than the bill total.';
  END IF;

  UPDATE public.visit
  SET status = 'completed', closed_at = NOW(), amount_paid = p_amount_paid,
      checkout_qr_token = NULL, qr_expires_at = NULL
  WHERE id = p_visit_id;

  INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, actor_role)
  VALUES ('visit', p_visit_id, 'completed', p_client_id, 'client');

  PERFORM public.rpc_issue_reward(p_visit_id, p_client_id);
END;
$$;

-- Manager: force close an open visit
CREATE OR REPLACE FUNCTION public.rpc_manager_override(p_visit_id uuid, p_manager_id uuid, p_amount_paid numeric, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_client_id UUID;
  v_status TEXT;
BEGIN
  PERFORM private.assert_manager(p_manager_id);

  IF p_reason IS NULL OR trim(p_reason) = '' THEN RAISE EXCEPTION 'Override reason is required.'; END IF;
  IF p_amount_paid IS NULL OR p_amount_paid < 0 THEN RAISE EXCEPTION 'Amount paid must be zero or more.'; END IF;

  SELECT client_id, status INTO v_client_id, v_status FROM public.visit WHERE id = p_visit_id FOR UPDATE;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Visit not found.'; END IF;
  IF v_status NOT IN ('checked_in', 'in_service', 'awaiting_checkout_scan', 'flagged_stale') THEN
    RAISE EXCEPTION 'Only open visits can be force closed.';
  END IF;

  UPDATE public.visit
  SET status = 'completed_override', closed_at = NOW(), amount_paid = p_amount_paid,
      resolution_reason = p_reason, checkout_qr_token = NULL, qr_expires_at = NULL
  WHERE id = p_visit_id;

  INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, actor_role, reason)
  VALUES ('visit', p_visit_id, 'completed_override', p_manager_id, 'manager', p_reason);

  PERFORM public.rpc_issue_reward(p_visit_id, v_client_id);
END;
$$;

-- Manager: void a visit (+ optional loyalty clawback)
CREATE OR REPLACE FUNCTION public.rpc_void_visit(p_visit_id uuid, p_manager_id uuid, p_reason text, p_keep_reward boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_client_id UUID;
  v_status TEXT;
BEGIN
  PERFORM private.assert_manager(p_manager_id);

  IF p_reason IS NULL OR trim(p_reason) = '' THEN RAISE EXCEPTION 'Void reason is required.'; END IF;

  SELECT client_id, status INTO v_client_id, v_status FROM public.visit WHERE id = p_visit_id FOR UPDATE;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Visit not found.'; END IF;
  IF v_status = 'voided' THEN RAISE EXCEPTION 'Visit is already voided.'; END IF;

  UPDATE public.visit SET status = 'voided', voided_at = NOW(), void_reason = p_reason WHERE id = p_visit_id;
  UPDATE public.service_line SET status = 'voided', void_reason = p_reason
  WHERE visit_id = p_visit_id AND status = 'active';

  IF NOT coalesce(p_keep_reward, false) THEN
    UPDATE public.discount_code
    SET status = 'voided', voided_at = NOW(), void_reason = 'Clawback: visit voided'
    WHERE (redeemed_visit_id = p_visit_id OR earned_visit_id = p_visit_id) AND status IN ('issued', 'redeemed');

    INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, actor_role, reason)
    VALUES ('client', v_client_id, 'loyalty_clawback', p_manager_id, 'manager', 'Visit voided: ' || p_reason);
  ELSE
    INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, actor_role, reason)
    VALUES ('client', v_client_id, 'loyalty_clawback_skipped', p_manager_id, 'manager', 'Manager kept reward. Reason: ' || p_reason);
  END IF;

  INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, actor_role, reason)
  VALUES ('visit', p_visit_id, 'voided', p_manager_id, 'manager', p_reason);
END;
$$;

-- Manager: hide a rating
CREATE OR REPLACE FUNCTION public.rpc_hide_rating(p_rating_id uuid, p_manager_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.assert_manager(p_manager_id);

  IF p_reason IS NULL OR trim(p_reason) = '' THEN RAISE EXCEPTION 'Hide reason is required.'; END IF;
  UPDATE public.rating SET hidden_by_employee_id = p_manager_id, hidden_reason = p_reason WHERE id = p_rating_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rating not found.'; END IF;

  INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, actor_role, reason)
  VALUES ('rating', p_rating_id, 'hidden', p_manager_id, 'manager', p_reason);
END;
$$;

-- ---------------------------------------------------------------------
-- 6. Function privileges (Supabase grants EXECUTE to anon by default)
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.rpc_start_visit(uuid),
  public.rpc_add_service_line(uuid, uuid, uuid, uuid),
  public.rpc_employee_complete_visit(uuid, uuid),
  public.rpc_checkout_complete(uuid, uuid, text, numeric),
  public.rpc_manager_override(uuid, uuid, numeric, text),
  public.rpc_void_visit(uuid, uuid, text, boolean),
  public.rpc_hide_rating(uuid, uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.rpc_start_visit(uuid),
  public.rpc_add_service_line(uuid, uuid, uuid, uuid),
  public.rpc_employee_complete_visit(uuid, uuid),
  public.rpc_checkout_complete(uuid, uuid, text, numeric),
  public.rpc_manager_override(uuid, uuid, numeric, text),
  public.rpc_void_visit(uuid, uuid, text, boolean),
  public.rpc_hide_rating(uuid, uuid, text)
TO authenticated;

-- Internal-only functions: nobody calls these through the API.
REVOKE EXECUTE ON FUNCTION public.rpc_issue_reward(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

COMMIT;

-- =====================================================================
-- After running: link test logins (sign up at /login first), e.g.
--
-- UPDATE public.employee SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'manager@example.com')
--   WHERE id = '11111111-1111-1111-1111-111111111111';   -- Aunt Manager (manager)
-- UPDATE public.employee SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'staff@example.com')
--   WHERE id = '11111111-1111-1111-1111-111111111102';   -- Demo Staff (employee)
-- UPDATE public.client   SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'client@example.com')
--   WHERE id = '11111111-1111-1111-1111-111111111101';   -- Test Client
--
-- Verify:
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relnamespace = 'public'::regnamespace AND relkind = 'r';
-- =====================================================================
