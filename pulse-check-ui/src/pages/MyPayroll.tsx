"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { useUser } from "@/context/UserContext"; 
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
import { Download, Loader2 } from "lucide-react";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import qs from "qs";

const MyPayroll = () => {
  const { toast } = useToast();
  const { user } = useUser();

  const [month, setMonth] = useState(() => new Date().toLocaleString('default', { month: 'long' }));
  const [year, setYear] = useState(() => new Date().getFullYear().toString());

  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [payroll, setPayroll] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const payslipRef = useRef(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem("jwt_token") : null;
  const authConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` },
  }), [token]);

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

  const fetchData = async () => {
    if (!user || !token) {
      toast({ title: "Authentication Error", description: "Please log in to view your payroll.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPayroll(null);
    
    try {
      const employeeQuery = qs.stringify({
        filters: { users_permissions_user: { id: { $eq: user.id } } },
        populate: ['monthly_ctc'],
      }, { encodeValuesOnly: true });

      const employeeRes = await axios.get(`http://localhost:1337/api/employees?${employeeQuery}`, authConfig);
      const currentEmployee = employeeRes.data.data?.[0];

      if (!currentEmployee) {
        toast({ title: "Error", description: "Employee profile not found.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      setEmployeeDetails(currentEmployee);

      const payrollQuery = qs.stringify({
        filters: {
          employee: { id: { $eq: currentEmployee.id } },
          month: { $eq: month },
          year: { $eq: year },
        },
        populate: ['employee'],
      }, { encodeValuesOnly: true });

      const payrollRes = await axios.get(`http://localhost:1337/api/payrolls?${payrollQuery}`, authConfig);
      if (payrollRes.data.data.length > 0) {
        setPayroll(payrollRes.data.data[0]);
      }

      let allAttendances = [];
      let page = 1;
      let pageCount = 1;

      const monthIndex = new Date(Date.parse(month + " 1, " + year)).getMonth();
      const startDate = new Date(parseInt(year), monthIndex, 1);
const endDate = new Date(parseInt(year), monthIndex + 1, 0);
endDate.setHours(23, 59, 59, 999); 

const startDateString = startDate.toISOString().split('T')[0];
const endDateString = endDate.toISOString().split('T')[0];

      
      while (page <= pageCount) {
        const attendanceQuery = qs.stringify({
          filters: {
            employee: { id: { $eq: currentEmployee.id } },
            date: { $gte: startDateString, $lte: endDateString },
          },
          pagination: { page: page, pageSize: 100 },
          populate: ['employee'],
        }, { encodeValuesOnly: true });

        const res = await axios.get(`http://localhost:1337/api/attendances?${attendanceQuery}`, authConfig);
        allAttendances = [...allAttendances, ...res.data.data];
        pageCount = res.data.meta.pagination.pageCount;
        page++;
        console.log(res);
      }

      setAttendances(allAttendances);
    } catch (error) {
      console.error("Failed to fetch payroll data:", error);
      toast({
        title: "Error",
        description: "Could not fetch your payroll data. Please check the network and API.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchData();
    }
  }, [user, token, month, year]);

  const attendanceCalculations = useMemo(() => {
    if (!employeeDetails) {
      return { present: 0, absent: 0, lateCount: 0, totalWorkingDays: 0, presentIncludingLate: 0 };
    }

    const present = attendances.filter((a) => a.attributes.status?.toLowerCase() === "present").length;
    const lateCount = attendances.filter((a) => a.attributes.status?.toLowerCase() === "late").length;
    const absentCount = attendances.filter((a) => a.attributes.status?.toLowerCase() === "absent").length;

    const attendedDays = present + lateCount;

    const totalWorkingDays = getWorkingDays(month, year);

    const absent = absentCount;

    return {
      present,
      absent,
      lateCount,
      totalWorkingDays,
      presentIncludingLate: attendedDays
    };
  }, [attendances, employeeDetails, month, year]);

  const payrollCalculations = useMemo(() => {
    if (!employeeDetails) {
      return {
        monthlyCTC: 0,
        annualCTC: 0,
        earnings: { basic: 0, hra: 0, transport: 0, medical: 0, fixed: 0, gross: 0 },
        deductions: { professionalTax: 0, tds: 0, absentDeduction: 0, lateDeduction: 0, otherDeductions: 0, total: 0 },
        netPayable: 0,
      };
    }
    const monthlyCTC = employeeDetails.attributes.monthly_ctc || 0;
    const { absent, lateCount, totalWorkingDays } = attendanceCalculations;

    const basic = monthlyCTC * 0.5;
    const hra = basic * 0.4;
    const transport = hra * 0.30;
    const medical = transport * 0.80;
    const fixed = monthlyCTC - (basic + hra + transport + medical);
    const grossEarnings = monthlyCTC;

    const professionalTax = 200;
    const tds = 2289;
    const perDaySalary = totalWorkingDays > 0 ? monthlyCTC / totalWorkingDays : 0;
    const absentDeduction = perDaySalary * absent;
    const lateDeductionGroups = Math.floor(lateCount / 3);
    const lateDeduction = lateDeductionGroups * (perDaySalary / 2);
    const otherDeductions = absentDeduction + lateDeduction;
    const totalDeductions = professionalTax + tds + otherDeductions;
    const netPayable = grossEarnings - totalDeductions;

    return {
      monthlyCTC,
      annualCTC: monthlyCTC * 12,
      earnings: { basic, hra, transport, medical, fixed, gross: grossEarnings },
      deductions: { professionalTax, tds, absentDeduction, lateDeduction, otherDeductions, total: totalDeductions },
      netPayable,
    };
  }, [employeeDetails, attendanceCalculations]);

  const handleDownload = async () => {
    if (!payslipRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(payslipRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 5, 5, pdfWidth - 10, pdfHeight - 10);
      pdf.save(`Payslip-${month}-${year}-${employeeDetails.attributes.name}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "PDF Error", description: "Could not generate the PDF.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const renderPayslipContent = () => {
    if (!payrollCalculations || !employeeDetails) return <div className="text-center p-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
    const { earnings, deductions, netPayable } = payrollCalculations;
    const { presentIncludingLate } = attendanceCalculations;
    const emp = employeeDetails.attributes;

    const formatCurrency = (value) => value != null ? value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A';

    return (
      <div ref={payslipRef} className="p-4 bg-white text-xs text-gray-800">
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">Salary Slip: {month} {year}</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-8 text-xs mb-4 border-t border-b py-2">
          <div>
            <p><span className="font-bold">Employee Name:</span> {emp.name}</p>
            <p><span className="font-bold">Employee Code:</span> {emp.employeeid}</p>
            <p><span className="font-bold">Date of Joining:</span> {new Date(emp.joinDate).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p><span className="font-bold">Designation:</span> {emp.position}</p>
            <p><span className="font-bold">PAN:</span> {emp.pan}</p>
            <p><span className="font-bold">Present Days:</span> {presentIncludingLate}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <h3 className="font-bold text-center mb-2 underline">EARNINGS</h3>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-1 border text-center w-1/6">Sr.</th>
                  <th className="p-1 border text-left">Description</th>
                  <th className="p-1 border text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-1 border text-center">1</td><td className="p-1 border">Basic</td><td className="p-1 border text-right">{formatCurrency(earnings.basic)}</td></tr>
                <tr><td className="p-1 border text-center">2</td><td className="p-1 border">HRA</td><td className="p-1 border text-right">{formatCurrency(earnings.hra)}</td></tr>
                <tr><td className="p-1 border text-center">3</td><td className="p-1 border">Transport Allowance</td><td className="p-1 border text-right">{formatCurrency(earnings.transport)}</td></tr>
                <tr><td className="p-1 border text-center">4</td><td className="p-1 border">Medical Allowance</td><td className="p-1 border text-right">{formatCurrency(earnings.medical)}</td></tr>
                <tr><td className="p-1 border text-center">5</td><td className="p-1 border">Special Allowance</td><td className="p-1 border text-right">{formatCurrency(earnings.fixed)}</td></tr>
                <tr className="font-bold bg-gray-50"><td className="p-1 border" colSpan="2">Total Gross Salary</td><td className="p-1 border text-right">{formatCurrency(earnings.gross)}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="font-bold text-center mb-2 underline">DEDUCTIONS</h3>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-1 border text-center w-1/6">Sr.</th>
                  <th className="p-1 border text-left">Description</th>
                  <th className="p-1 border text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-1 border text-center">1</td><td className="p-1 border">Professional Tax</td><td className="p-1 border text-right">{formatCurrency(deductions.professionalTax)}</td></tr>
                <tr><td className="p-1 border text-center">2</td><td className="p-1 border">TDS</td><td className="p-1 border text-right">{formatCurrency(deductions.tds)}</td></tr>
                <tr><td className="p-1 border text-center">3</td><td className="p-1 border">Other Deductions</td><td className="p-1 border text-right">{formatCurrency(deductions.otherDeductions)}</td></tr>
                <tr className="font-bold bg-gray-50"><td className="p-1 border" colSpan="2">Total Deduction</td><td className="p-1 border text-right">{formatCurrency(deductions.total)}</td></tr>
                <tr className="font-bold bg-gray-50"><td className="p-1 border" colSpan="2">Total Net Salary</td><td className="p-1 border text-right">{formatCurrency(netPayable)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-center mt-4 text-xs">Your Total Net Salary will be transferred to your Account.</p>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <CardTitle className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
              My Payroll
            </CardTitle>
            <div className="flex gap-2">
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'long' })).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 5 + i).toString()).map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : payroll && employeeDetails && payrollCalculations ? (
                <TableRow key={payroll.id}>
                  <TableCell>{employeeDetails?.attributes?.employeeid}</TableCell>
                  <TableCell>{employeeDetails?.attributes?.name}</TableCell>
                  <TableCell>{attendanceCalculations.present}</TableCell>
                  <TableCell>{attendanceCalculations.lateCount}</TableCell>
                  <TableCell className="text-red-500">{attendanceCalculations.absent}</TableCell>
                  <TableCell className="font-bold">
                    {payrollCalculations.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${payroll.attributes.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {payroll.attributes.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setIsPayslipDialogOpen(true)}>
                      <Download className="h-5 w-5 text-gray-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow><TableCell colSpan={8} className="text-center h-24 text-gray-500">No payroll data found for {month} {year}.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isPayslipDialogOpen} onOpenChange={setIsPayslipDialogOpen}>
        <DialogContent className="max-w-4xl p-0">
          {renderPayslipContent()}
          <DialogFooter className="mt-4 p-4 border-t">
            <Button variant="outline" onClick={() => setIsPayslipDialogOpen(false)}>Close</Button>
            <Button onClick={handleDownload} disabled={isDownloading}>
              {isDownloading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyPayroll;