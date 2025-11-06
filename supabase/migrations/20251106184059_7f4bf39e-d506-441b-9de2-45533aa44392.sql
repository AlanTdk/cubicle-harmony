-- Insertar roles para usuarios existentes
INSERT INTO public.user_roles (user_id, role) VALUES
  ('3d3227a4-763f-4e21-aa1d-c0a488b4a016', 'admin'),
  ('651fd77d-2c1f-4c00-b5e3-2c3f9da2a379', 'bibliotecario')
ON CONFLICT (user_id, role) DO NOTHING;

-- Permitir a nuevos usuarios insertar su propio rol durante registro
DROP POLICY IF EXISTS "Users can insert their own role during signup" ON public.user_roles;
CREATE POLICY "Users can insert their own role during signup" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);