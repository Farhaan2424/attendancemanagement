import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Download, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

const reportTypes = [
  { value: "attendance", label: "Attendance Report" },
  { value: "leave", label: "Leave Report" },
  { value: "overtime", label: "Overtime Report" },
  { value: "department", label: "Department Report" }
];

const mockReportData = {
  attendanceOverview: {
    totalEmployees: 156,
    averageAttendance: 91.2,
    punctualityRate: 87.5,
    absenteeismRate: 8.8
  },
  departmentStats: [
    { department: "Engineering", attendance: 94.2, employees: 45, trend: "up" },
    { department: "Marketing", attendance: 89.1, employees: 23, trend: "down" },
    { department: "Sales", attendance: 88.7, employees: 34, trend: "up" },
    { department: "HR", attendance: 96.3, employees: 12, trend: "up" },
    { department: "Finance", attendance: 91.8, employees: 18, trend: "down" }
  ],
  monthlyTrends: [
    { month: "Jan", attendance: 89.2, leaves: 45 },
    { month: "Feb", attendance: 91.1, leaves: 38 },
    { month: "Mar", attendance: 87.8, leaves: 52 },
    { month: "Apr", attendance: 92.3, leaves: 41 },
    { month: "May", attendance: 90.7, leaves: 47 }
  ]
};

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState("attendance");
  const [dateRange, setDateRange] = useState<Date>(new Date());

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate insights and reports on attendance data
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedReport} onValueChange={setSelectedReport}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange ? format(dateRange, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange}
                onSelect={(date) => date && setDateRange(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockReportData.attendanceOverview.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {mockReportData.attendanceOverview.averageAttendance}%
            </div>
            <p className="text-xs text-muted-foreground">+2.1% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Punctuality Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {mockReportData.attendanceOverview.punctualityRate}%
            </div>
            <p className="text-xs text-muted-foreground">+1.2% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absenteeism Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {mockReportData.attendanceOverview.absenteeismRate}%
            </div>
            <p className="text-xs text-muted-foreground">-0.5% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Department Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
            <CardDescription>
              Attendance rates by department
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockReportData.departmentStats.map((dept, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-primary rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">{dept.department}</p>
                    <p className="text-xs text-muted-foreground">{dept.employees} employees</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    {dept.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span className="text-sm font-medium">{dept.attendance}%</span>
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {dept.trend === "up" ? "Improving" : "Declining"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>
              Attendance and leave patterns over time
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockReportData.monthlyTrends.map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-xs font-medium">{month.month}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Attendance: {month.attendance}%</p>
                    <p className="text-xs text-muted-foreground">{month.leaves} leave requests</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${month.attendance}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reports</CardTitle>
          <CardDescription>
            Generate common reports with one click
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
              <Download className="h-6 w-6 mb-2" />
              <span>Monthly Attendance</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
              <Download className="h-6 w-6 mb-2" />
              <span>Leave Summary</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
              <Download className="h-6 w-6 mb-2" />
              <span>Department Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}