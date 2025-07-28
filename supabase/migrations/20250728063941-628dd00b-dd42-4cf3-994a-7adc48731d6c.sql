-- Create companies table with UUID
CREATE TABLE public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    access_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add company_id to existing tables
ALTER TABLE public.employees ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.projects ADD COLUMN company_id UUID REFERENCES public.companies(id);

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

-- Insert seed data - Demo SA company
INSERT INTO public.companies (name, access_code) VALUES ('Demo SA', 'DEMO123');

-- Get the company ID for Demo SA
DO $$
DECLARE
    demo_company_id UUID;
    jean_employee_id UUID;
    admin_employee_id UUID;
BEGIN
    -- Get Demo SA company ID
    SELECT id INTO demo_company_id FROM public.companies WHERE access_code = 'DEMO123';
    
    -- Update existing employees to belong to Demo SA
    UPDATE public.employees SET company_id = demo_company_id;
    
    -- Update existing projects to belong to Demo SA
    UPDATE public.projects SET company_id = demo_company_id;
    
    -- Update first employee to be Jean
    UPDATE public.employees 
    SET first_name = 'Jean', last_name = 'Dupont', access_code = 'EMP001'
    WHERE id = (SELECT id FROM public.employees ORDER BY created_at LIMIT 1)
    RETURNING id INTO jean_employee_id;
    
    -- Create admin employee record
    INSERT INTO public.employees (first_name, last_name, access_code, company_id, active) 
    VALUES ('Patron', 'Demo', 'ADMIN001', demo_company_id, true)
    RETURNING id INTO admin_employee_id;
END $$;