-- Allow employees to create their own role record
CREATE POLICY "Employees can create their role" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'employee'
);
