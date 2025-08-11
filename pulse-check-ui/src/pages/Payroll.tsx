import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Wallet,
  Clock,
  CircleCheck,
  CircleDollarSign,
  Download,
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// NOTE: The 'react-spinners' import was removed as you are using a custom Spinner component.
//       This will prevent a potential "module not found" error if the package is not installed.

const StatCard = ({ title, value, icon, className }) => (
  <Card className={`shadow-sm transition-shadow hover:shadow-md ${className}`}>
    <CardContent className="p-4 flex items-center justify-between">
      <div className="flex flex-col">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="text-gray-400">{icon}</div>
    </CardContent>
  </Card>
);

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

export default function PayrollSummary() {
  const { toast } = useToast();
  const [month, setMonth] = useState("July");
  const [year, setYear] = useState("2025");
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [payrollGenMonth, setPayrollGenMonth] = useState(() => new Date().toLocaleString('default', { month: 'long' }));
  const [payrollGenYear, setPayrollGenYear] = useState(() => new Date().getFullYear().toString());
  const [bulkPayrollData, setBulkPayrollData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem("jwt_token") : null;

  const authConfig = useMemo(() => ({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }), [token]);

  const fetchData = async () => {
    if (!token) {
      console.error("Authentication token not found. Cannot fetch data.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const api = axios.create({ baseURL: "http://localhost:1337/api" });

      // NEW: Refactored fetchAllPages to be more robust.
      // This version will continue fetching pages in a loop until it gets an empty result,
      // ensuring all data is retrieved even if the backend's pagination metadata is unreliable.
      const fetchAllPages = async (endpoint, pageSize = 100) => {
        let allData = [];
        let page = 1;
        let hasMoreData = true;

        while (hasMoreData) {
          const response = await api.get(`${endpoint}?pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate=employee`, authConfig);
          const pageData = response.data.data;
          
          if (pageData && pageData.length > 0) {
            allData = [...allData, ...pageData];
            // Check if this is the last page based on the number of items returned
            if (pageData.length < pageSize) {
              hasMoreData = false;
            } else {
              page++;
            }
          } else {
            hasMoreData = false; // No more data to fetch
          }
        }
        return allData;
      };

      const [payrollsRes, employeesRes, attendancesRes] = await Promise.all([
        fetchAllPages("/payrolls"),
        fetchAllPages("/employees"),
        fetchAllPages("/attendances"),
      ]);

      setPayrolls(payrollsRes);
      setEmployees(employeesRes);
      setAttendances(attendancesRes);

    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data from the server. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const roleType = user?.role?.type;
        setUserRole(roleType);
        
      } catch (error) {
        console.error("Failed to parse user data from local storage:", error);
        setUserRole(null);
      }
    }
    fetchData();
  }, [token]);

  useEffect(() => {
    if (isCreateDialogOpen) {
      prepareBulkPayroll();
    }
  }, [isCreateDialogOpen]);

  const filteredPayrolls = useMemo(() => {
    const filtered = payrolls.filter(
      (p) => {
        const payrollMonth = p.attributes.month;
        const payrollYear = p.attributes.year;
        const employeeId = p.attributes.employee?.data?.id;
        if (!employeeId) return false;
        const employee = employees.find(e => e.id === employeeId);
        const employeeStatus = employee?.attributes.status;
        return payrollMonth === month && payrollYear?.toString() === year && employeeStatus === "active";
      }
    );
    return filtered.sort((a, b) => {
      const aEmpId = a.attributes.employee?.data?.id;
      const bEmpId = b.attributes.employee?.data?.id;
      const aEmp = employees.find(e => e.id === aEmpId)?.attributes;
      const bEmp = employees.find(e => e.id === bEmpId)?.attributes;
      const aEmployeeId = parseInt(aEmp?.employeeid, 10);
      const bEmployeeId = parseInt(bEmp?.employeeid, 10);
      return aEmployeeId - bEmployeeId;
    });
  }, [payrolls, month, year, employees]);

  const payrollSummary = useMemo(() => {
    const totalNetPay = filteredPayrolls.reduce((sum, p) => sum + p.attributes.net_pay, 0);
    const totalEmployees = employees.filter(e => e.attributes.status === "active").length;
    const pendingPayrolls = filteredPayrolls.filter(p => p.attributes.status === "Generated" || p.attributes.status === "Pending").length;
    const paidPayrolls = filteredPayrolls.filter(p => p.attributes.status === "Paid").length;
    return {
      totalNetPay: totalNetPay.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
      totalEmployees,
      pendingPayrolls,
      paidPayrolls,
      totalPayrolls: filteredPayrolls.length,
    };
  }, [filteredPayrolls, employees]);

  const getEmployeeDetails = (empId) => {
    return employees.find((e) => e.id === empId)?.attributes || {};
  };

  const getWorkingDays = (targetMonth, targetYear) => {
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

  const calculateAttendance = (empId, targetMonth, targetYear) => {
    const monthIndex = new Date(`${targetMonth} 1, ${targetYear}`).getMonth() + 1;
    const empAttendances = attendances.filter((a) => {
      const attendanceEmpId = a.employee?.id || a.attributes?.employee?.data?.id;
      if (!attendanceEmpId || attendanceEmpId !== empId) return false;
      const attendanceDate = new Date(a.attributes.date);
      return (
        attendanceDate.getMonth() + 1 === monthIndex &&
        attendanceDate.getFullYear().toString() === targetYear
      );
    });
    const present = empAttendances.filter((a) => a.attributes.status?.toLowerCase() === "present").length;
    const lateCount = empAttendances.filter((a) => a.attributes.status?.toLowerCase() === "late").length;
    const attendedDays = present + lateCount;
    const totalWorkingDays = getWorkingDays(targetMonth, targetYear);
    const absent = totalWorkingDays - attendedDays;
    return { present, absent, lateCount, totalWorkingDays };
  };

  const breakdown = (emp, absent, lateCount, totalWorkingDays, monthlyCTC) => {

    const basic = monthlyCTC * 0.5;
    const hra = basic * 0.4;
    const transport = hra * 0.30;
    const medical = transport * 0.80;
    const fixed = monthlyCTC - (basic + hra + transport + medical);

    const professionalTax = 200;
    const tds = 2289;

    const perDaySalary = totalWorkingDays > 0 ? monthlyCTC / totalWorkingDays : 0;
    const absentDeduction = perDaySalary * absent;
    const lateDeductionGroups = Math.floor(lateCount / 3);
    const lateDeduction = lateDeductionGroups * (perDaySalary / 2);

    const otherDeductions = absentDeduction + lateDeduction;

    const totalDeduction = professionalTax + tds + otherDeductions;
    const net = monthlyCTC - totalDeduction;

    const annualCTC = monthlyCTC * 12;
    const annualBasic = basic * 12;
    const annualHra = hra * 12;
    const annualTransport = transport * 12;
    const annualMedical = medical * 12;
    const annualFixed = fixed * 12;

    return {
      basic, hra, transport, medical, fixed, net, monthlyCTC, annualCTC,
      deduction: totalDeduction, absentDeduction, lateDeduction,
      annualBasic, annualHra, annualTransport, annualMedical, annualFixed,
      professionalTax, tds, otherDeductions
    };
  };

  const prepareBulkPayroll = () => {
    const eligibleEmployees = employees.filter(
      (emp) =>
        emp.attributes.status === "active" &&
        emp.attributes.monthly_ctc !== null &&
        emp.attributes.monthly_ctc > 0
    );
    const data = eligibleEmployees.map((emp) => {
      const { present, absent, lateCount, totalWorkingDays } = calculateAttendance(emp.id, payrollGenMonth, payrollGenYear);
      const monthlyCTC = emp.attributes.monthly_ctc || 0;
      const calc = breakdown(emp.attributes, absent, lateCount, totalWorkingDays, monthlyCTC);
      const existingPayroll = payrolls.find(
        p => p.attributes.employee?.data?.id === emp.id &&
          p.attributes.month === payrollGenMonth &&
          p.attributes.year.toString() === payrollGenYear
      );
      return {
        employeeId: emp.id,
        name: emp.attributes.name,
        department: emp.attributes.department,
        present,
        late: lateCount,
        absent,
        monthly_ctc: monthlyCTC,
        net_pay: calc.net,
        status: existingPayroll ? existingPayroll.attributes.status : "Generated",
        deductions: calc.deduction,
        existingPayrollId: existingPayroll?.id || null,
      };
    }).sort((a, b) => {
      const aEmpId = a.employeeId;
      const bEmpId = b.employeeId;
      const aEmp = employees.find(e => e.id === aEmpId)?.attributes;
      const bEmp = employees.find(e => e.id === bEmpId)?.attributes;
      const aEmployeeId = parseInt(aEmp?.employeeid, 10);
      const bEmployeeId = parseInt(bEmp?.employeeid, 10);
      return aEmployeeId - bEmployeeId;
    });
    setBulkPayrollData(data);
  };

  const handleBulkStatusChange = (employeeId, newStatus) => {
    setBulkPayrollData(prevData =>
      prevData.map(payroll =>
        payroll.employeeId === employeeId
          ? { ...payroll, status: newStatus }
          : payroll
      )
    );
  };

  useEffect(() => {
    if (isCreateDialogOpen) {
      prepareBulkPayroll();
    }
  }, [payrollGenMonth, payrollGenYear, isCreateDialogOpen, employees, payrolls, attendances]);

  const handleGeneratePayroll = async () => {
    if (!token) {
      console.error("Authentication token not found. Cannot generate payroll.");
      toast({
        title: "Error",
        description: "Authentication token not found. Please log in.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    let successCount = 0;
    let failCount = 0;
    const generationResults = [];
    for (const data of bulkPayrollData) {
      const payload = {
        data: {
          month: payrollGenMonth,
          year: payrollGenYear,
          status: data.status,
          net_pay: parseFloat(data.net_pay.toFixed(2)),
          deductions: Math.round(data.deductions),
          present_days: data.present,
          absent_days: data.absent,
          late_entries: data.late,
          employee: data.employeeId,
        }
      };
      try {
        if (data.existingPayrollId) {
          await axios.put(`http://localhost:1337/api/payrolls/${data.existingPayrollId}`, payload, authConfig);
          generationResults.push({ name: data.name, status: "Updated" });
          successCount++;
        } else {
          await axios.post("http://localhost:1337/api/payrolls", payload, authConfig);
          generationResults.push({ name: data.name, status: "Generated" });
          successCount++;
        }
      } catch (error) {
        failCount++;
        let errorMessage = "Unknown error.";
        if (axios.isAxiosError(error) && error.response) {
          console.error(`Axios Error Response for employee ${data.name}:`, error.response.data);
          errorMessage = error.response.data?.error?.message || `Status: ${error.response.status}`;
        }
        console.error(`Error processing payroll for employee ${data.name}:`, error);
        generationResults.push({ name: data.name, status: "Failed", error: errorMessage });
      }
    }
    if (successCount > 0) {
      toast({
        title: "Generation Complete",
        description: `Successfully processed ${successCount} payrolls.`,
        variant: "default",
      });
    }
    if (failCount > 0) {
      toast({
        title: "Generation Failed",
        description: `Failed to process ${failCount} payrolls. Check the console for details.`,
        variant: "destructive",
      });
    }
    setIsCreateDialogOpen(false);
    setBulkPayrollData([]);
    await fetchData();
    setMonth(payrollGenMonth);
    setYear(payrollGenYear);
    setIsGenerating(false);
  };

  const downloadSalarySlip = async (payroll) => {
    const empId = payroll.attributes.employee?.data?.id;
    if (!empId) {
      toast({
        title: "Error",
        description: "Employee details not found for this payroll.",
        variant: "destructive",
      });
      return;
    }

    const emp = getEmployeeDetails(empId);
    if (!emp) {
      toast({
        title: "Error",
        description: "Employee details not found.",
        variant: "destructive",
      });
      return;
    }

    const { present, absent, lateCount, totalWorkingDays } = calculateAttendance(empId, month, year);

    const calc = breakdown(emp, absent, lateCount, totalWorkingDays, emp.monthly_ctc || 0);

    const presentIncludingLate = present + lateCount;

    const pdfContent = `
      <div id="pdf-content" style="padding: 20px; font-family: 'Inter', sans-serif; font-size: 10px; line-height: 1.5; color: #333;">
        <style>
          .pdf-table {
            width: 100%;
            border-collapse: collapse;
          }
          .pdf-table th, .pdf-table td {
            border: 1px solid black;
            padding: 4px 8px;
            text-align: left;
            font-size: 10px;
          }
          .pdf-table th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-align: center;
          }
          .pdf-table tfoot td {
            font-weight: bold;
          }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .font-bold { font-weight: bold; }
          .text-right { text-align: right; }
          .mt-2 { margin-top: 8px; }
          .mb-2 { margin-bottom: 8px; }
          .text-center { text-align: center; }
          .w-100 { width: 100%; }
        </style>

        <div class="flex justify-between" style="font-size: 11px;">
          <p></p>
          <p class="font-bold">Salary Slip: ${month} ${year}</p>
        </div>

        <div style="margin-top: 10px; font-size: 11px;">
            <p><span class="font-bold pb-3">Employee Name:</span> ${emp.name}</p>
            <p><span class="font-bold pb-3">Employee Code:</span> ${emp.employeeid}</p>
            <p><span class="font-bold">Date of Joining:</span> ${new Date(emp.joinDate).toLocaleDateString()}</p>
            <div style="position: absolute; top: 52px; right: 20px;">
              <p><span class="font-bold pb-3">Designation:</span> ${emp.position}</p>
              <p style="margin-top: 5px; pb-3"><span class="font-bold">Pan:</span> ${emp.pan}</p>
              <p style="margin-top: 5px; pb-3"><span class="font-bold">Present for no. of days:</span> ${presentIncludingLate}</p>
            </div>
        </div>
        <div class="flex justify-between" style="margin-top: 20px; gap: 20px;">
          <div style="width: 90%;">
            <p class="font-bold text-center pt-5" style="margin-bottom:10px; gap: 10px;">EARNINGS</p>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th style="width: 30%;">Sr. No.</th>
                  <th style="width: 70%;">Description</th>
                  <th style="width: 50%;" class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-center">1</td>
                  <td>Basic</td>
                  <td class="text-right">${calc.basic.toFixed(2)}</td>
                </tr>
                <tr>
                  <td class="text-center">2</td>
                  <td>HRA</td>
                  <td class="text-right">${calc.hra.toFixed(2)}</td>
                </tr>
                <tr>
                  <td class="text-center">3</td>
                  <td>Trasport Allowance</td>
                  <td class="text-right">${calc.transport.toFixed(2)}</td>
                </tr>
                <tr>
                  <td class="text-center">4</td>
                  <td>Medical Allowance</td>
                  <td class="text-right">${calc.medical.toFixed(2)}</td>
                </tr>
                <tr>
                  <td class="text-center">5</td>
                  <td>Special Allowance</td>
                  <td class="text-right">${calc.fixed.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="2" class="font-bold">Total Gross Salary</td>
                  <td class="font-bold text-right">₹${(calc.basic + calc.hra + calc.transport + calc.medical + calc.fixed).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="width: 90%;">
            <p class="font-bold text-center p-2 pt-5" >DEDUCTION</p>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th style="width: 40%;">Sr. No.</th>
                  <th style="width: 90%;">Description</th>
                  <th style="width: 60%;" class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-center">1</td>
                  <td>Profession Tax</td>
                  <td class="text-right">${calc.professionalTax.toFixed(2)}</td>
                </tr>
                <tr>
                  <td class="text-center">2</td>
                  <td>TDS</td>
                  <td class="text-right">${calc.tds.toFixed(2)}</td>
                </tr>
                <tr>
                  <td class="text-center">3</td>
                  <td>Other Deductions</td>
                  <td class="text-right">${calc.otherDeductions.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="2" class="font-bold">Total Deduction</td>
                  <td class="font-bold text-right">₹${calc.deduction.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="2" class="font-bold">Total Net Salary</td>
                  <td class="font-bold text-right">₹${calc.net.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p style="margin-top: 20px; font-size: 11px;">Your Total Net Salary will be transferred to your Account.</p>
      </div>
    `;

    const tempElement = document.createElement('div');
    tempElement.innerHTML = pdfContent;
    tempElement.style.position = 'absolute';
    tempElement.style.left = '-9999px';
    document.body.appendChild(tempElement);

    try {
      const canvas = await html2canvas(tempElement, {
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Salary_Slip_${emp.name}_${month}_${year}.pdf`);
      toast({
        title: "Success",
        description: "Salary slip downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate the salary slip PDF.",
        variant: "destructive",
      });
    } finally {
      document.body.removeChild(tempElement);
    }
  };
  
  const handleCreatePayrollClick = () => {
    if (userRole === 'admin') {
      setIsCreateDialogOpen(true);
    } else {
      setIsPermissionDenied(true);
    }
  };


  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Payroll Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Payrolls"
          value={payrollSummary.totalPayrolls}
          icon={<CircleDollarSign size={24} />}
          className="bg-white"
        />
        <StatCard
          title="Pending Payrolls"
          value={payrollSummary.pendingPayrolls}
          icon={<Clock size={24} />}
          className="bg-white"
        />
        <StatCard
          title="Paid Payrolls"
          value={payrollSummary.paidPayrolls}
          icon={<CircleCheck size={24} />}
          className="bg-white"
        />
      </div>
      <Card className="shadow-lg rounded-xl border border-gray-200">
        <CardHeader className="flex flex-row justify-between items-center bg-white p-6 rounded-t-xl">
          <CardTitle className="text-2xl font-bold text-gray-800">Payroll Summary</CardTitle>
          <div className="flex gap-2 items-center">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[120px] bg-white border border-gray-300"><SelectValue /></SelectTrigger>
              <SelectContent>{["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px] bg-white border border-gray-300"><SelectValue /></SelectTrigger>
              <SelectContent>{["2023", "2024", "2025", "2026"].map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}</SelectContent>
            </Select>
            <Button
              onClick={handleCreatePayrollClick}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200 ease-in-out"
            >
              <Download size={16} className="mr-2" />
              Create Payroll
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100 hover:bg-gray-100">
                  <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-700">ID</TableHead>
                  <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Employee</TableHead>
                  <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Department</TableHead>
                  <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Present</TableHead>
                  <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Late</TableHead>
                  <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Absent</TableHead>
                  <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Net Pay</TableHead>
                  <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-500">Loading...</TableCell></TableRow>
                ) : filteredPayrolls.length > 0 ? (
                  filteredPayrolls.map((p) => {
                    const empId = p.attributes.employee?.data?.id;
                    if (!empId) return null;
                    const empAttr = getEmployeeDetails(empId);
                    const { present, absent, lateCount } = calculateAttendance(empId, month, year);
                    const calc = breakdown(empAttr, absent, lateCount, getWorkingDays(month, year), empAttr.monthly_ctc || 0);
                    return (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-gray-50 transition-colors duration-150">
                        <TableCell className="px-6 py-3">{empAttr?.employeeid || empId}</TableCell>
                        <TableCell className="px-6 py-3 font-medium text-gray-900" onClick={() => setSelectedPayroll(p)}>{empAttr.name}</TableCell>
                        <TableCell className="px-6 py-3 text-gray-600" onClick={() => setSelectedPayroll(p)}>{empAttr.department}</TableCell>
                        <TableCell className="px-6 py-3 text-green-600 font-medium" onClick={() => setSelectedPayroll(p)}>{present}</TableCell>
                        <TableCell className="px-6 py-3 text-yellow-600 font-medium" onClick={() => setSelectedPayroll(p)}>{lateCount}</TableCell>
                        <TableCell className="px-6 py-3 text-red-600 font-medium" onClick={() => setSelectedPayroll(p)}>{absent}</TableCell>
                        <TableCell className="px-6 py-3 font-bold">₹{calc.net.toFixed(2)}</TableCell>
                        <TableCell className="px-6 py-3" onClick={() => setSelectedPayroll(p)}>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${p.attributes.status === 'Paid' ? 'bg-green-100 text-green-800' : p.attributes.status === 'Pending' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {p.attributes.status || "Generated"}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadSalarySlip(p);
                            }}
                          >
                            <Download size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-500">No payroll data found for {month} {year}.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {selectedPayroll && (
        <Dialog open={true} onOpenChange={() => setSelectedPayroll(null)}>
          <DialogContent className="max-w-xl p-6">
            <DialogHeader className="border-b pb-4 mb-4">
              <DialogTitle className="text-2xl font-bold">Salary Details</DialogTitle>
            </DialogHeader>
            <div className="text-sm space-y-4">
              {(() => {
                const empId = selectedPayroll.attributes.employee?.data?.id;
                const emp = getEmployeeDetails(empId);
                const { absent, lateCount, totalWorkingDays } = calculateAttendance(empId, month, year);
                const calc = breakdown(emp, absent, lateCount, totalWorkingDays, emp.monthly_ctc || 0);
                return (
                  <>
                    <div className="flex items-center justify-between p-4 bg-gray-100 rounded-md">
                      <div>
                        <div className="text-lg font-bold">MONTHLY CTC</div>
                        <div className="text-lg font-semibold">₹{calc.monthlyCTC.toLocaleString('en-IN')} per month</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">ANNUAL CTC</div>
                        <div className="text-lg font-semibold">₹{calc.annualCTC.toLocaleString('en-IN')} per year</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-800">Earnings Breakdown</h4>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                        <span>Basic (50% of CTC)</span><span className="text-right">₹{calc.basic.toFixed(2)}</span><span className="text-right">₹{calc.annualBasic.toFixed(2)}</span>
                        <span>House Rent Allowance (40% of Basic)</span><span className="text-right">₹{calc.hra.toFixed(2)}</span><span className="text-right">₹{calc.annualHra.toFixed(2)}</span>
                        <span>Transport Allowance </span><span className="text-right">₹{calc.transport.toFixed(2)}</span><span className="text-right">₹{calc.annualTransport.toFixed(2)}</span>
                        <span>Medical </span><span className="text-right">₹{calc.medical.toFixed(2)}</span><span className="text-right">₹{calc.annualMedical.toFixed(2)}</span>
                        <span>Fixed Allowance</span><span className="text-right">₹{calc.fixed.toFixed(2)}</span><span className="text-right">₹{calc.annualFixed.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2 mt-2">
                        <span>Gross Earnings</span>
                        <span>₹{(calc.basic + calc.hra + calc.transport + calc.medical + calc.fixed).toFixed(2)}</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-3 gap-x-4 font-bold text-lg text-gray-800">
                      <span className="col-span-1">Cost to Company</span>
                      <span className="text-right col-span-1">₹{calc.monthlyCTC.toFixed(2)}</span>
                      <span className="text-right col-span-1">₹{calc.annualCTC.toFixed(2)}</span>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold text-gray-800">Deductions</h4>

                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-gray-600">
                        <span>Professional Tax</span>
                        <span className="text-right text-red-600">- ₹{calc.professionalTax.toFixed(2)}</span>
                        <span>TDS</span>
                        <span className="text-right text-red-600">- ₹{calc.tds.toFixed(2)}</span>
                        {calc.absentDeduction > 0 && (
                          <>
                            <span>Deduction for {absent} Absent Day(s)</span>
                            <span className="text-right text-red-600">- ₹{calc.absentDeduction.toFixed(2)}</span>
                          </>
                        )}
                        {calc.lateDeduction > 0 && (
                          <>
                            <span>Deduction for {lateCount} Late Entries</span>
                            <span className="text-right text-red-600">- ₹{calc.lateDeduction.toFixed(2)}</span>
                          </>
                        )}
                        {calc.deduction > 0 ? (
                          <div className="col-span-2 border-t mt-2 pt-2 flex justify-between font-bold text-red-600">
                            <span>Total Deductions</span>
                            <span>- ₹{calc.deduction.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 col-span-2">No deductions for this month.</span>
                        )}
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-extrabold text-2xl text-gray-900 bg-blue-50 p-4 rounded-md">
                      <span>Net Payable</span>
                      <span>₹{calc.net.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-6">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-2xl font-bold">Bulk Payroll Generation</DialogTitle>
            <div className="flex gap-2 pt-2 items-center">
              <Select value={payrollGenMonth} onValueChange={setPayrollGenMonth}>
                <SelectTrigger className="w-[140px] bg-white border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent>{["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
              </Select>
              <Select value={payrollGenYear} onValueChange={setPayrollGenYear}>
                <SelectTrigger className="w-[110px] bg-white border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent>{["2023", "2024", "2025", "2026"].map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-100 z-10">
                <TableRow>
                  <TableHead className="text-left px-4 py-3 font-semibold">Employee</TableHead>
                  <TableHead className="text-left px-4 py-3 font-semibold">CTC</TableHead>
                  <TableHead className="text-left px-4 py-3 font-semibold">Present</TableHead>
                  <TableHead className="text-left px-4 py-3 font-semibold">Late</TableHead>
                  <TableHead className="text-left px-4 py-3 font-semibold">Absent</TableHead>
                  <TableHead className="text-left px-4 py-3 font-semibold">Deductions</TableHead>
                  <TableHead className="text-left px-4 py-3 font-semibold">Net Pay</TableHead>
                  <TableHead className="text-left px-4 py-3 font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bulkPayrollData.length > 0 ? (
                  bulkPayrollData.map(data => (
                    <TableRow key={data.employeeId}>
                      <TableCell className="px-4 py-2">
                        <div className="font-medium text-gray-800">{data.name}</div>
                        <div className="text-xs text-gray-500">{data.department}</div>
                      </TableCell>
                      <TableCell className="px-4 text-gray-700">₹{data.monthly_ctc.toLocaleString()}</TableCell>
                      <TableCell className="px-4 text-green-600 font-medium">{data.present}</TableCell>
                      <TableCell className="px-4 text-yellow-600 font-medium">{data.late}</TableCell>
                      <TableCell className="px-4 text-red-600 font-medium">{data.absent}</TableCell>
                      <TableCell className="px-4 text-red-600">₹{data.deductions.toFixed(2)}</TableCell>
                      <TableCell className="px-4 font-semibold">₹{data.net_pay.toFixed(2)}</TableCell>
                      <TableCell className="px-4">
                        <Select
                          value={data.status}
                          onValueChange={(newStatus) => handleBulkStatusChange(data.employeeId, newStatus)}
                        >
                          <SelectTrigger className="w-[120px] bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Generated">Generated</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-sm text-gray-500">No employees eligible for payroll generation for {payrollGenMonth} {payrollGenYear}.<br /><span className="text-xs text-gray-400">(All active employees with a positive CTC are shown here)</span></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleGeneratePayroll}
              disabled={isGenerating || bulkPayrollData.length === 0}
            >
              {isGenerating && <Spinner />}
              {isGenerating ? 'Processing...' : `Generate/Update Payroll for ${bulkPayrollData.length} Employees`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isPermissionDenied} onOpenChange={setIsPermissionDenied}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Permission Denied</DialogTitle>
          </DialogHeader>
          <div className="text-center p-4">
            <p>You don't have permission to access this feature.</p>
            <p className="mt-2 text-sm text-gray-500">Only an administrator can create payrolls.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPermissionDenied(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
