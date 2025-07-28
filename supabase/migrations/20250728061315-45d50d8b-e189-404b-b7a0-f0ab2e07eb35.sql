-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('employee', 'admin');

-- Create employees table
CREATE TABLE public.employees (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    access_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_entries table
CREATE TABLE public.time_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    hours_worked DECIMAL(4,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
    meal_taken BOOLEAN NOT NULL DEFAULT false,
    km_driven DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (km_driven >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    UNIQUE (user_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's employee_id
CREATE OR REPLACE FUNCTION public.get_user_employee_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT employee_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'employee'
  LIMIT 1
$$;

-- RLS Policies for employees
CREATE POLICY "Employees can view active employees" ON public.employees
FOR SELECT TO authenticated
USING (active = true);

CREATE POLICY "Admins can manage all employees" ON public.employees
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for projects
CREATE POLICY "Authenticated users can view projects" ON public.projects
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage projects" ON public.projects
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for time_entries
CREATE POLICY "Employees can view their own time entries" ON public.time_entries
FOR SELECT TO authenticated
USING (
  employee_id = public.get_user_employee_id(auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Employees can create their own time entries" ON public.time_entries
FOR INSERT TO authenticated
WITH CHECK (employee_id = public.get_user_employee_id(auth.uid()));

CREATE POLICY "Employees can update their own time entries" ON public.time_entries
FOR UPDATE TO authenticated
USING (
  employee_id = public.get_user_employee_id(auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Employees can delete their own time entries" ON public.time_entries
FOR DELETE TO authenticated
USING (
  employee_id = public.get_user_employee_id(auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage all time entries" ON public.time_entries
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON public.time_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.employees (first_name, last_name, access_code) VALUES
('Jean', 'Dupont', 'EMP001'),
('Marie', 'Martin', 'EMP002'),
('Pierre', 'Durand', 'EMP003');

INSERT INTO public.projects (name, address) VALUES
('Maison Résidentielle A', '123 Rue de la Paix, Montreal'),
('Bureau Commercial B', '456 Avenue des Affaires, Quebec'),
('Rénovation Appartement C', '789 Boulevard Central, Laval');