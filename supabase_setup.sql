-- قم بتشغيل هذا الكود في Supabase SQL Editor
-- https://supabase.com/dashboard/project/hgicxzzqnharvtzgkuwr/sql/new

CREATE TABLE IF NOT EXISTS public.bot_data (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- السماح للبوت بالقراءة والكتابة
ALTER TABLE public.bot_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON public.bot_data
  FOR ALL USING (true) WITH CHECK (true);

-- إدراج صف البيانات الأولي
INSERT INTO public.bot_data (id, data)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
