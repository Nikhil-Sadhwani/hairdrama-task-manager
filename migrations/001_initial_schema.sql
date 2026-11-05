
-- Profiles Table

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);


-- Tasks Table

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id),
    assigned_to UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);


-- Enable RLS

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;


-- Profiles Policies

DROP POLICY IF EXISTS "Users can view profiles"
ON public.profiles;

CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);


DROP POLICY IF EXISTS "Users can insert own profile"
ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());


DROP POLICY IF EXISTS "Users can update own profile"
ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());


-- Tasks Policies

DROP POLICY IF EXISTS "Users can view tasks"
ON public.tasks;

CREATE POLICY "Users can view tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
);


DROP POLICY IF EXISTS "Users can create tasks"
ON public.tasks;

CREATE POLICY "Users can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());


DROP POLICY IF EXISTS "Users can update tasks"
ON public.tasks;

CREATE POLICY "Users can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
)
WITH CHECK (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
);


DROP POLICY IF EXISTS "Users can delete tasks"
ON public.tasks;

CREATE POLICY "Users can delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (created_by = auth.uid());


-- Database Permissions

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.tasks TO authenticated;


-- Existing Database Columns

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS due_date DATE;
