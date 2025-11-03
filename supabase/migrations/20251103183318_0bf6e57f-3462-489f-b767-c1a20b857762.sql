-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'bibliotecario');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: users can read their own roles
CREATE POLICY "Users can read their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS policy: admins can read all roles
CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policy: admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update cubicles RLS to allow authenticated users with roles
DROP POLICY IF EXISTS "Allow public read access on cubicles" ON public.cubicles;
DROP POLICY IF EXISTS "Allow public update on cubicles" ON public.cubicles;

CREATE POLICY "Authenticated users can read cubicles"
ON public.cubicles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'bibliotecario')
);

CREATE POLICY "Authenticated users can update cubicles"
ON public.cubicles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'bibliotecario')
);

-- Update students RLS
DROP POLICY IF EXISTS "Allow public read access on students" ON public.students;
DROP POLICY IF EXISTS "Allow public insert on students" ON public.students;
DROP POLICY IF EXISTS "Allow public update on students" ON public.students;

CREATE POLICY "Authenticated users can read students"
ON public.students
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'bibliotecario')
);

CREATE POLICY "Authenticated users can insert students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'bibliotecario')
);

CREATE POLICY "Authenticated users can update students"
ON public.students
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'bibliotecario')
);

-- Update rentals RLS
DROP POLICY IF EXISTS "Allow public read access on rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow public insert on rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow public update on rentals" ON public.rentals;

CREATE POLICY "Authenticated users can read rentals"
ON public.rentals
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'bibliotecario')
);

CREATE POLICY "Authenticated users can insert rentals"
ON public.rentals
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'bibliotecario')
);

CREATE POLICY "Authenticated users can update rentals"
ON public.rentals
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'bibliotecario')
);

-- Create indexes for better performance (skip existing ones)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_students_control_number ON public.students(control_number);