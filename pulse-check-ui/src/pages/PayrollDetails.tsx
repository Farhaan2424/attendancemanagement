import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

// --- INTERFACES ---
interface EmployeeAttributes {
    name: string;
    department: string;
    monthly_ctc: number | null;
    transport_allowance?: number;
    medical_allowance?: number;
}
  
interface Employee {
    id: number;
    attributes: EmployeeAttributes;
}

interface AttendanceAttributes {
    date: string;
    status: "present" | "late" | "absent";
    employee: {
      data: {
        id: number;
      } | null;
      id?: number;
    };
}
  
interface Attendance {
    id: number;
    attributes: AttendanceAttributes;
}

interface PayrollAttributes {
    month: string;
    year: number;
    status: string;
    net_pay: number;
    deductions: number;
    present_days: number;
    absent_days: number;
    late_entries: number;
    employee: {
      data: {
        id: number;
      } | null;
    };
}
  
interface PayrollType {
    id: number;
    attributes: PayrollAttributes;
}
  
interface BreakdownResultType {
    net: number;
    monthlyCTC: number;
    annualCTC: number;
    deduction: number;
    absentDeduction: number;
    lateDeduction: number;
    basic: number;
    hra: number;
    transport: number;
    medical: number;
    fixed: number;
    annualBasic: number;
    annualHra: number;
    annualTransport: number;
    annualMedical: number;
    annualFixed: number;
}
  
interface AttendanceResultType {
    present: number;
    absent: number;
    lateCount: number;
    totalWorkingDays: number;
}

// A small component for loading spinners
const Spinner = () => (
    <svg
      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

// Helper function to get working days in a month (excluding weekends)
const getWorkingDays = (targetMonth: string, targetYear: string): number => {
    const monthIndex = new Date(`${targetMonth} 1, ${targetYear}`).getMonth();
    const date = new Date(parseInt(targetYear), monthIndex, 1);
    let workingDays = 0;
    while (date.getMonth() === monthIndex) {
      const day = date.getDay();
      if (day !== 0 && day !== 6) workingDays++;
      date.setDate(date.getDate() + 1);
    }
    return workingDays;
};

// Helper function to calculate payroll breakdown
const breakdown = (emp: EmployeeAttributes, absent: number, lateCount: number, totalWorkingDays: number, monthlyCTC: number): BreakdownResultType => {
    const basic = monthlyCTC * 0.5;
    const hra = basic * 0.4;
    const transport = emp?.transport_allowance ?? 1600;
    const medical = emp?.medical_allowance ?? 1250;
    const fixed = monthlyCTC - (basic + hra + transport + medical);
    const perDaySalary = totalWorkingDays > 0 ? monthlyCTC / totalWorkingDays : 0;
    const absentDeduction = perDaySalary * absent;
    const lateDeductionGroups = Math.floor(lateCount / 3);
    const lateDeduction = lateDeductionGroups * (perDaySalary / 2);
    const totalDeduction = absentDeduction + lateDeduction;
    const net = monthlyCTC - totalDeduction;

    // Calculate annual values
    const annualCTC = monthlyCTC * 12;
    const annualBasic = basic * 12;
    const annualHra = hra * 12;
    const annualTransport = transport * 12;
    const annualMedical = medical * 12;
    const annualFixed = fixed * 12;

    return { 
      basic, hra, transport, medical, fixed, net, monthlyCTC, annualCTC, deduction: totalDeduction, absentDeduction, lateDeduction,
      annualBasic, annualHra, annualTransport, annualMedical, annualFixed
    };
};

// Helper function to calculate attendance for an employee for a given month/year
const calculateAttendance = (attendances: Attendance[], empId: number, targetMonth: string, targetYear: string): AttendanceResultType => {
    const monthIndex = new Date(`${targetMonth} 1, ${targetYear}`).getMonth() + 1;
    const empAttendances = attendances.filter((a) => {
        const date = new Date(a.attributes.date);
        const attendanceEmpId = a.attributes?.employee?.data?.id || a.attributes?.employee?.id || null;
        return (
            attendanceEmpId === empId &&
            date.getMonth() + 1 === monthIndex &&
            date.getFullYear().toString() === targetYear
        );
    });

    const present = empAttendances.filter((a) => a.attributes.status?.toLowerCase() === "present").length;
    const lateCount = empAttendances.filter((a) => a.attributes.status?.toLowerCase() === "late").length;
    const attendedDays = present + lateCount;
    const totalWorkingDays = getWorkingDays(targetMonth, targetYear);
    const absent = totalWorkingDays - attendedDays;

    return { present, absent, lateCount, totalWorkingDays };
};

export default function PayrollDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [payroll, setPayroll] = useState<PayrollType | null>(null);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!id) return;
            setIsLoading(true);

            try {
                // Fetch the specific payroll
                const payrollRes = await axios.get<{ data: PayrollType }>(`http://localhost:1337/api/payrolls/${id}?populate=employee`);
                const payrollData = payrollRes.data.data;
                setPayroll(payrollData);

                const employeeId = payrollData.attributes.employee?.data?.id;

                if (employeeId) {
                    // Fetch the associated employee
                    const employeeRes = await axios.get<{ data: Employee }>(`http://localhost:1337/api/employees/${employeeId}`);
                    setEmployee(employeeRes.data.data);

                    // Fetch all attendances to calculate current month's attendance
                    const attendancesRes = await axios.get<{ data: Attendance[] }>(`http://localhost:1337/api/attendances?pagination[pageSize]=1000&populate=employee`);
                    setAttendances(attendancesRes.data.data);
                }

            } catch (error) {
                console.error("Failed to fetch payroll details:", error);
                setPayroll(null); // Clear state if an error occurs
                setEmployee(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [id]);
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <p>Loading payroll details...</p>
            </div>
        );
    }
    
    if (!payroll || !employee) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <Card>
                    <CardHeader><CardTitle>Payroll Not Found</CardTitle></CardHeader>
                    <CardContent>
                        <p>The requested payroll could not be found.</p>
                        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const payrollAttr = payroll.attributes;
    const empAttr = employee.attributes;
    const { absent, lateCount, totalWorkingDays } = calculateAttendance(attendances, employee.id, payrollAttr.month, payrollAttr.year.toString());
    const calc = breakdown(empAttr, absent, lateCount, totalWorkingDays, empAttr.monthly_ctc || 0);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
                <h1 className="text-3xl font-bold">Salary Details for {empAttr.name}</h1>
            </div>
            
            <Card className="shadow-lg max-w-4xl mx-auto">
                <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-xl font-bold">{empAttr.name} ({empAttr.department})</div>
                        <div className="text-lg text-gray-500">{payrollAttr.month}, {payrollAttr.year}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-gray-800 border-b pb-4 mb-4">
                        <div>
                            <div className="text-lg font-bold">ANNUAL CTC</div>
                            <div className="text-lg">₹{calc.annualCTC.toLocaleString('en-IN')} per year</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold">MONTHLY CTC</div>
                            <div className="text-lg">₹{calc.monthlyCTC.toLocaleString('en-IN')} per month</div>
                        </div>
                    </div>

                    <div className="text-sm space-y-4">
                        <div className="grid grid-cols-3 font-semibold text-gray-700">
                            <div className="col-span-1">SALARY COMPONENTS</div>
                            <div className="text-right col-span-1">MONTHLY AMOUNT</div>
                            <div className="text-right col-span-1">ANNUAL AMOUNT</div>
                        </div>
                        
                        <div className="mt-2 text-gray-600">
                            <div className="font-semibold mb-1">Earnings</div>
                            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                                <span>Basic (50% of CTC)</span><span className="text-right">₹{calc.basic.toFixed(2)}</span><span className="text-right">₹{calc.annualBasic.toFixed(2)}</span>
                                <span>House Rent Allowance (40% of Basic)</span><span className="text-right">₹{calc.hra.toFixed(2)}</span><span className="text-right">₹{calc.annualHra.toFixed(2)}</span>
                                <span>Transport Allowance</span><span className="text-right">₹{calc.transport.toFixed(2)}</span><span className="text-right">₹{calc.annualTransport.toFixed(2)}</span>
                                <span>Medical</span><span className="text-right">₹{calc.medical.toFixed(2)}</span><span className="text-right">₹{calc.annualMedical.toFixed(2)}</span>
                                <span>Fixed Allowance</span><span className="text-right">₹{calc.fixed.toFixed(2)}</span><span className="text-right">₹{calc.annualFixed.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-4"/>
                    <div className="grid grid-cols-3 gap-x-4 font-bold text-lg text-gray-800">
                        <span className="col-span-1">Cost to Company</span>
                        <span className="text-right col-span-1">₹{calc.monthlyCTC.toFixed(2)}</span>
                        <span className="text-right col-span-1">₹{calc.annualCTC.toFixed(2)}</span>
                    </div>
                    <Separator className="my-4"/>

                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Deductions</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {calc.absentDeduction > 0 && (<><span className="text-gray-600">Deduction for {payrollAttr.absent_days} Absent Day(s)</span><span className="text-right text-red-600">- ₹{calc.absentDeduction.toFixed(2)}</span></>)}
                            {calc.lateDeduction > 0 && (<><span className="text-gray-600">Deduction for {payrollAttr.late_entries} Late Entr(y/ies)</span><span className="text-right text-red-600">- ₹{calc.lateDeduction.toFixed(2)}</span></>)}
                            {calc.deduction > 0 && (
                                <>
                                    <div className="font-bold border-t mt-1 pt-1 text-gray-800">Total Deductions</div>
                                    <div className="font-bold border-t mt-1 pt-1 text-right text-red-600">- ₹{calc.deduction.toFixed(2)}</div>
                                </>
                            )}
                            {calc.deduction === 0 && (<span className="text-gray-500 col-span-2">No deductions for this month.</span>)}
                        </div>
                    </div>

                    <Separator className="my-4"/>

                    <div className="flex justify-between font-extrabold text-2xl text-gray-900">
                        <span>Net Payable</span>
                        <span>₹{payrollAttr.net_pay.toFixed(2)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
