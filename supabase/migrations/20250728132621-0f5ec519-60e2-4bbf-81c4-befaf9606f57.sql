-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  first_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  work_date DATE NOT NULL,
  hours_worked DECIMAL(4,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
  meal_taken BOOLEAN NOT NULL DEFAULT false,
  km_driven DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (km_driven >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('employee', 'admin');

-- Create user_roles table for authentication
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  employee_id UUID REFERENCES public.employees(id),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to get user's employee ID
CREATE OR REPLACE FUNCTION public.get_user_employee_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT employee_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'employee'
  LIMIT 1
$$;

-- RLS Policies for companies
CREATE POLICY "Admins can manage companies" ON public.companies
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view their company" ON public.companies
  FOR SELECT USING (
    id IN (
      SELECT e.company_id 
      FROM public.employees e
      JOIN public.user_roles ur ON ur.employee_id = e.id
      WHERE ur.user_id = auth.uid()
    )
  );

-- RLS Policies for employees  
CREATE POLICY "Admins can manage employees" ON public.employees
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow anonymous access for employee login" ON public.employees
  FOR SELECT USING (true);

CREATE POLICY "Employees can view company employees" ON public.employees
  FOR SELECT USING (
    company_id = (
      SELECT e.company_id 
      FROM public.employees e
      JOIN public.user_roles ur ON ur.employee_id = e.id
      WHERE ur.user_id = auth.uid()
      LIMIT 1
    ) OR public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for time_entries
CREATE POLICY "Employees can manage their own time entries" ON public.time_entries
  FOR ALL USING (
    employee_id = public.get_user_employee_id(auth.uid()) OR 
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow role creation during signup" ON public.user_roles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON public.time_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.companies (name, access_code) VALUES 
  ('Timber Corp', 'TIMBER2024');

INSERT INTO public.employees (company_id, first_name) VALUES 
  ((SELECT id FROM public.companies WHERE access_code = 'TIMBER2024'), 'Pierre');