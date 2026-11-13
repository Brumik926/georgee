CREATE TABLE public.user_access_blocks (
 email text PRIMARY KEY,
 user_id uuid,
 is_blocked boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid NOT NULL DEFAULT auth.uid()
);
GRANT SELECT ON public.user_access_blocks TO authenticated;
GRANT ALL ON public.user_access_blocks TO service_role;
ALTER TABLE public.user_access_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin access status" ON public.user_access_blocks FOR SELECT TO authenticated USING (user_id = auth.uid() OR email = lower(auth.jwt()->>'email') OR public.has_role(auth.uid(), 'admin'));

CREATE FUNCTION public.is_banking_blocked() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.user_access_blocks b WHERE b.is_blocked AND (b.user_id = auth.uid() OR b.email = (SELECT lower(u.email) FROM auth.users u WHERE u.id = auth.uid())));
$$;
REVOKE ALL ON FUNCTION public.is_banking_blocked() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_banking_blocked() TO authenticated, service_role;

CREATE FUNCTION public.set_login_user_block(_event_id uuid, _blocked boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_email text; target_user uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') OR public.is_banking_blocked() THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT lower(trim(email)) INTO target_email FROM public.login_events WHERE id = _event_id;
 IF target_email IS NULL OR target_email = '' THEN RAISE EXCEPTION 'Missing user email'; END IF;
 SELECT id INTO target_user FROM auth.users WHERE lower(email) = target_email;
 IF target_user = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user AND role = 'admin') THEN RAISE EXCEPTION 'Administrator accounts cannot be blocked'; END IF;
 INSERT INTO public.user_access_blocks(email,user_id,is_blocked,updated_by) VALUES(target_email,target_user,_blocked,auth.uid()) ON CONFLICT(email) DO UPDATE SET user_id = EXCLUDED.user_id,is_blocked = EXCLUDED.is_blocked,updated_at = now(),updated_by = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.set_login_user_block(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_login_user_block(uuid, boolean) TO authenticated;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','transactions','goals','budgets','notifications','notification_settings','payment_templates','login_events'] LOOP
 EXECUTE format('CREATE POLICY "unblocked banking access" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_banking_blocked()) WITH CHECK (NOT public.is_banking_blocked())',t);
 END LOOP;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_access_blocks;