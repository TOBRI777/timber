-- Create companies table
CREATE TABLE public.companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    access_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add company_id to existing tables
ALTER TABLE public.employees ADD COLUMN company_id INTEGER REFERENCES public.companies(id);
ALTER TABLE public.projects ADD COLUMN company_id INTEGER REFERENCES public.projects(id);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create policies for companies
CREATE POLICY "Admins can manage their company" 
ON public.companies 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.employees e ON ur.employee_id = e.id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND e.company_id = companies.id
  )
);

CREATE POLICY "Employees can view their company" 
ON public.companies 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.employees e ON ur.employee_id = e.id
    WHERE ur.user_id = auth.uid() 
    AND e.company_id = companies.id
  )
);

-- Update existing RLS policies to include company filtering
DROP POLICY "Employees can view active employees" ON public.employees;
CREATE POLICY "Employees can view active employees in their company" 
ON public.employees 
FOR SELECT 
USING (
  active = true AND (
    company_id = (
      SELECT e.company_id 
      FROM public.user_roles ur
      JOIN public.employees e ON ur.employee_id = e.id
      WHERE ur.user_id = auth.uid()
      LIMIT 1
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY "Authenticated users can view projects" ON public.projects;
CREATE POLICY "Users can view projects in their company" 
ON public.projects 
FOR SELECT 
USING (
  company_id = (
    SELECT e.company_id 
    FROM public.user_roles ur
    JOIN public.employees e ON ur.employee_id = e.id
    WHERE ur.user_id = auth.uid()
    LIMIT 1
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Add trigger for companies updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data
INSERT INTO public.companies (id, name, access_code) VALUES (1, 'Demo SA', 'DEMO123');

-- Update existing employees to belong to company 1
UPDATE public.employees SET company_id = 1;

-- Update existing projects to belong to company 1  
UPDATE public.projects SET company_id = 1;

-- Update the first employee to be Jean
UPDATE public.employees 
SET first_name = 'Jean', last_name = 'Dupont', access_code = 'EMP001'
WHERE id = (SELECT id FROM public.employees ORDER BY created_at LIMIT 1);

-- Create admin user in auth.users (this will be done manually via Supabase auth)
-- Email: patron@demo.ch
-- Password: Demo123!

-- The admin user will need to be linked to an employee record for the RLS to work
INSERT INTO public.employees (first_name, last_name, access_code, company_id, active) 
VALUES ('Admin', 'Demo', 'ADMIN001', 1, true);

-- Reset sequence for companies
SELECT setval('companies_id_seq', 1, true);