DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) IN ('lizaktomas@proton.me','lizaktomas926@gmail.com')
ON CONFLICT DO NOTHING;
CREATE POLICY "admin login select all" ON public.login_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_events;