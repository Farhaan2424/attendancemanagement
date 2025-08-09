-- Fix security issues by setting proper search paths

-- Recreate the update function with secure search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the payroll calculation function with secure search path
CREATE OR REPLACE FUNCTION public.calculate_monthly_payroll(
  p_employee_id UUID,
  p_month INTEGER,
  p_year INTEGER,
  p_working_days INTEGER DEFAULT 22
)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
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
$$;