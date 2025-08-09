-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  hire_date DATE NOT NULL,
  basic_salary DECIMAL(10,2) NOT NULL,
  allowances DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day')),
  hours_worked DECIMAL(4,2) DEFAULT 0,
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Create payroll table for monthly salary calculations
CREATE TABLE public.payroll (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  working_days INTEGER NOT NULL,
  present_days INTEGER NOT NULL,
  absent_days INTEGER NOT NULL,
  late_days INTEGER DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  basic_salary DECIMAL(10,2) NOT NULL,
  allowances DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  gross_salary DECIMAL(10,2) NOT NULL,
  net_salary DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(employee_id, month, year)
);

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on employees" 
ON public.employees FOR ALL USING (true);

CREATE POLICY "Allow all operations on attendance_records" 
ON public.attendance_records FOR ALL USING (true);

CREATE POLICY "Allow all operations on payroll" 
ON public.payroll FOR ALL USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate payroll
CREATE OR REPLACE FUNCTION public.calculate_monthly_payroll(
  p_employee_id UUID,
  p_month INTEGER,
  p_year INTEGER,
  p_working_days INTEGER DEFAULT 22
)
RETURNS UUID AS $$
DECLARE
  v_employee public.employees%ROWTYPE;
  v_present_days INTEGER;
  v_absent_days INTEGER;
  v_late_days INTEGER;
  v_overtime_hours DECIMAL(5,2);
  v_basic_salary DECIMAL(10,2);
  v_allowances DECIMAL(10,2);
  v_overtime_pay DECIMAL(10,2);
  v_gross_salary DECIMAL(10,2);
  v_deductions DECIMAL(10,2);
  v_net_salary DECIMAL(10,2);
  v_payroll_id UUID;
BEGIN
  -- Get employee details
  SELECT * INTO v_employee FROM public.employees WHERE id = p_employee_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  -- Calculate attendance statistics
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('present', 'late', 'half_day')),
    COUNT(*) FILTER (WHERE status = 'absent'),
    COUNT(*) FILTER (WHERE status = 'late'),
    COALESCE(SUM(overtime_hours), 0)
  INTO v_present_days, v_absent_days, v_late_days, v_overtime_hours
  FROM public.attendance_records 
  WHERE employee_id = p_employee_id 
    AND EXTRACT(MONTH FROM date) = p_month 
    AND EXTRACT(YEAR FROM date) = p_year;

  -- Calculate salary components
  v_basic_salary := v_employee.basic_salary;
  v_allowances := v_employee.allowances;
  
  -- Pro-rate basic salary based on attendance
  v_basic_salary := (v_basic_salary * v_present_days) / p_working_days;
  
  -- Calculate overtime pay (1.5x hourly rate)
  v_overtime_pay := (v_employee.basic_salary / p_working_days / 8) * 1.5 * v_overtime_hours;
  
  -- Calculate deductions (example: late penalty)
  v_deductions := v_late_days * 100; -- 100 per late day
  
  v_gross_salary := v_basic_salary + v_allowances + v_overtime_pay;
  v_net_salary := v_gross_salary - v_deductions;

  -- Insert or update payroll record
  INSERT INTO public.payroll (
    employee_id, month, year, working_days, present_days, absent_days, 
    late_days, overtime_hours, basic_salary, allowances, overtime_pay, 
    deductions, gross_salary, net_salary
  ) VALUES (
    p_employee_id, p_month, p_year, p_working_days, v_present_days, v_absent_days,
    v_late_days, v_overtime_hours, v_basic_salary, v_allowances, v_overtime_pay,
    v_deductions, v_gross_salary, v_net_salary
  ) 
  ON CONFLICT (employee_id, month, year) 
  DO UPDATE SET
    working_days = EXCLUDED.working_days,
    present_days = EXCLUDED.present_days,
    absent_days = EXCLUDED.absent_days,
    late_days = EXCLUDED.late_days,
    overtime_hours = EXCLUDED.overtime_hours,
    basic_salary = EXCLUDED.basic_salary,
    allowances = EXCLUDED.allowances,
    overtime_pay = EXCLUDED.overtime_pay,
    deductions = EXCLUDED.deductions,
    gross_salary = EXCLUDED.gross_salary,
    net_salary = EXCLUDED.net_salary,
    generated_at = now()
  RETURNING id INTO v_payroll_id;

  RETURN v_payroll_id;
END;
$$ LANGUAGE plpgsql;