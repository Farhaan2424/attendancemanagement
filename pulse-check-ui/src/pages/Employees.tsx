import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeid: "",
    department: "",
    position: "",
    joinDate: "",
    phone: "",
    dob: "",
    fathersName: "",
    pan: "",
    residentialAddress: "",
    personalEmail: "",
    differentlyAbled: "",
    paymentMode: "",
    accountNumber: "",
    accountHolderName: "",
    bankName: "",
    ifsc: "",
    accountType: "",
    monthly_ctc: "",
    status: "active",
    gender: "Male",
    officeLocation: "",
  });

  // Defaulting to an empty string to ensure a check is performed after fetch
  const [userRole, setUserRole] = useState(null); 
  const [showAccessDeniedDialog, setShowAccessDeniedDialog] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("jwt_token");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const fetchUserRole = async () => {
    if (!token) return;
    try {
      const res = await axios.get("http://localhost:1337/api/users/me?populate=role", authConfig);
      // Assuming the API response is structured as res.data.role.name
      setUserRole(res.data.role?.name.toLowerCase());
    } catch (err) {
      console.error("Failed to fetch user role:", err);
      // In case of error, set a default role or handle as unauthenticated
      setUserRole("guest");
    }
  };

  const fetchEmployees = async () => {
    if (!token) {
      console.error("Authentication token not found.");
      return;
    }
    try {
      const res = await axios.get(
        "http://localhost:1337/api/employees?pagination[pageSize]=1000",
        authConfig
      );
      const formatted = res.data.data.map((emp) => ({
        id: emp.id,
        ...emp.attributes,
        employeeid: emp.attributes.employeeid,
      }));
      const sorted = formatted.sort(
        (a, b) => Number(a.employeeid) - Number(b.employeeid)
      );
      setEmployees(sorted);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserRole();
      fetchEmployees();
    }
  }, [token]);

  const handleAdd = async () => {
    if (userRole !== "admin" && userRole !== "hr") {
      setIsAddDialogOpen(false);
      setShowAccessDeniedDialog(true);
      return;
    }

    if (!token) {
      console.error("Authentication token not found.");
      return;
    }
    try {
      const payload = {
        data: formData,
      };

      await axios.post(
        "http://localhost:1337/api/employees",
        payload,
        authConfig
      );
      setFormData({
        name: "",
        email: "",
        employeeid: "",
        department: "",
        position: "",
        joinDate: "",
        phone: "",
        dob: "",
        fathersName: "",
        pan: "",
        residentialAddress: "",
        personalEmail: "",
        differentlyAbled: "",
        paymentMode: "",
        accountNumber: "",
        accountHolderName: "",
        bankName: "",
        ifsc: "",
        accountType: "",
        monthly_ctc: "",
        status: "active",
        gender: "Male",
        officeLocation: "",
      });
      setIsAddDialogOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error("Add error:", err.response?.data || err.message);
    }
  };

  const handleDelete = async (employeeId) => {
    if (userRole !== "admin" && userRole !== "hr") {
      setShowAccessDeniedDialog(true);
      return;
    }

    if (!token) {
      console.error("Authentication token not found.");
      return;
    }
    try {
      await axios.delete(
        `http://localhost:1337/api/employees/${employeeId}`,
        authConfig
      );
      fetchEmployees();
    } catch (err) {
      console.error("Delete error:", err.response?.data || err.message);
    }
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fields = [
    { name: "name", label: "Name" },
    { name: "email", label: "Official Email" },
    { name: "employeeid", label: "Employee ID" },
    { name: "department", label: "Department" },
    { name: "officeLocation", label: "Office Location" },
    { name: "position", label: "Position" },
    { name: "joinDate", label: "Join Date", type: "date" },
    { name: "phone", label: "Phone Number" },
    { name: "dob", label: "Date of Birth", type: "date" },
    { name: "fathersName", label: "Father's Name" },
    { name: "pan", label: "PAN" },
    { name: "residentialAddress", label: "Residential Address" },
    { name: "personalEmail", label: "Personal Email" },
    { name: "differentlyAbled", label: "Differently Abled (if any)" },
    { name: "paymentMode", label: "Payment Mode" },
    { name: "accountNumber", label: "Account Number" },
    { name: "accountHolderName", label: "Account Holder Name" },
    { name: "bankName", label: "Bank Name" },
    { name: "ifsc", label: "IFSC Code" },
    { name: "accountType", label: "Account Type" },
    { name: "monthly_ctc", label: "Monthly CTC" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Employee Management</h1>
        <p className="text-gray-500">Manage employee profiles and information</p>
      </div>

      <div className="flex justify-between mb-4">
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/3"
        />
        <Button
          onClick={() => {
            if (userRole === "admin" || userRole === "hr") {
              setIsAddDialogOpen(true);
            } else {
              setShowAccessDeniedDialog(true);
            }
          }}
        >
          Add Employee
        </Button>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {fields.map(({ name, label, type }) => (
                <div key={name}>
                  <Label htmlFor={name}>{label}</Label>
                  <Input
                    id={name}
                    type={type || "text"}
                    placeholder={label}
                    value={formData[name] || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, [name]: e.target.value })
                    }
                  />
                </div>
              ))}
              <div>
                <Label className="mb-1 block">Gender</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(val) =>
                    setFormData({ ...formData, gender: val })
                  }
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="Male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="Female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label className="mb-1 block">Status</Label>
                <RadioGroup
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData({ ...formData, status: val })
                  }
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="active" id="active" />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="inactive" id="inactive" />
                    <Label htmlFor="inactive">Inactive</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <Button className="w-full mt-2" onClick={handleAdd}>
              Save
            </Button>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Join Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEmployees.map((employee) => (
            <TableRow
              key={employee.id}
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => navigate(`/employees/${employee.id}`)}
            >
              <TableCell>{employee.employeeid}</TableCell>
              <TableCell>{employee.name}</TableCell>
              <TableCell>{employee.email}</TableCell>
              <TableCell>{employee.department}</TableCell>
              <TableCell>{employee.position}</TableCell>
              <TableCell>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold
                    ${
                      employee.status === "active"
                        ? "text-blue-700 bg-blue-100"
                        : "text-gray-600 bg-gray-200"
                    }`}
                >
                  {employee.status}
                </span>
              </TableCell>
              <TableCell>{employee.joinDate}</TableCell>
              <TableCell>
                {(userRole === "admin" || userRole === "hr") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(employee.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <Dialog open={showAccessDeniedDialog} onOpenChange={setShowAccessDeniedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Denied</DialogTitle>
            <DialogDescription>
              You do not have the necessary permissions to perform this action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowAccessDeniedDialog(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}