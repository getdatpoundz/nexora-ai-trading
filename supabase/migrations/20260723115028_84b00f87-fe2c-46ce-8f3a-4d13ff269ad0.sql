
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user','admin')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_by_admin_at TIMESTAMPTZ,
  read_by_user_at TIMESTAMPTZ
);
CREATE INDEX support_messages_user_created_idx ON public.support_messages (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own support messages"
ON public.support_messages FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own support messages"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_id AND sender_role = 'user')
  OR (public.has_role(auth.uid(), 'admin') AND sender_role = 'admin')
);

CREATE POLICY "Users and admins can mark read"
ON public.support_messages FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
