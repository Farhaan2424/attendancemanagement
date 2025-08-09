import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label"; 
import startCase from "lodash/startCase";

const fieldLabels = {
  name: "Full Name",
  fathersName: "Father's Name",
  dob: "Date of Birth",
  pan: "PAN",
  personalEmail: "Personal Email",
  residentialAddress: "Residential Address",
  differentlyAbled: "Differently Abled Type",
  joinDate: "Date of Joining",
  officeLocation: "Office Location",
  paymentMode: "Payment Mode",
  accountNumber: "Account Number",
  accountHolderName: "Account Holder Name",
  bankName: "Bank Name",
  ifsc: "IFSC",
  accountType: "Account Type",
  monthly_ctc: "Monthly CTC"
};

const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const token = localStorage.getItem("jwt_token");

  
  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  const fetchEmployee = async () => {
    setLoading(true);
    
    if (!token) {
        console.error("Authentication token not found.");
        setLoading(false);
        
        navigate("/login"); 
        return;
    }
    
    try {
      
      const res = await axios.get(`http://localhost:1337/api/employees/${id}`, authConfig);
      const emp = res.data.data;
      const attributes = emp.attributes;
      
      attributes.dob = formatDateForInput(attributes.dob);
      attributes.joinDate = formatDateForInput(attributes.joinDate);
  
      if (attributes.gender) {
        attributes.gender = startCase(attributes.gender);
      }
      if (attributes.status) {
        attributes.status = startCase(attributes.status);
      }
      
      setEmployee({ id: emp.id, ...attributes });
      setFormData({ ...attributes });
    } catch (err) {
      console.error("Fetch employee error:", err.response?.data || err.message);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.error("Invalid or expired token. Redirecting to login.");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchEmployee();
    }
  }, [id, token]);
  

  const handleUpdate = async () => {
    if (!token) {
        console.error("Authentication token not found.");
        navigate("/login");
        return;
    }
    try {
      const cleanedData = { ...formData };
      if (cleanedData.gender) {
        cleanedData.gender = cleanedData.gender.toLowerCase();
      }
      if (cleanedData.status) {
        cleanedData.status = cleanedData.status.toLowerCase();
      }

      console.log("Sending payload to API:", { data: cleanedData });

      // 5. Add authConfig to the PUT request
      const res = await axios.put(
        `http://localhost:1337/api/employees/${id}`,
        { data: cleanedData },
        authConfig
      );

      if (res.status === 200) {
        setEditMode(false);
        fetchEmployee();
      } else {
        console.error("Unexpected response:", res);
      }
    } catch (err) {
      console.error("Update error: ", err);
      if (axios.isAxiosError(err)) {
        console.error("Axios response data:", err.response?.data);
        console.error("Axios response status:", err.response?.status);
        console.error("Axios response headers:", err.response?.headers);

        const errorMessage = err.response?.data?.error?.message || `Server responded with status: ${err.response?.status}`;
        // Note: Using a custom modal or UI element is better than `alert()` for a seamless user experience.
        alert(`Failed to update employee. ${errorMessage}. See console for details.`);
      } else {
        alert("Failed to update employee. An unknown error occurred. See console for details.");
      }
      // Handle authentication errors and redirect
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.error("Invalid or expired token. Redirecting to login.");
        navigate("/login");
      }
    }
  };

  const maskAccountNumber = (acc = "") => {
    if (acc.length <= 4) return "XXXX";
    return "X".repeat(acc.length - 4) + acc.slice(-4);
  };

  const getLabel = (field) => fieldLabels[field] || startCase(field);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!employee) return <div className="p-6">Employee not found</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">
            Employee ID: {employee.employeeid}
          </h1>
        </div>
        <Button onClick={() => setEditMode(!editMode)} variant="outline">
          <Pencil className="h-4 w-4 mr-2" />
          {editMode ? "Cancel" : "Edit"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{getLabel("name")}</p>
                {editMode ? (
                  <Input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{employee.name}</p>
                )}
              </div>

              {["email", "phone", "joinDate", "department", "position", "officeLocation", "monthly_ctc"].map((field) => (
                <div key={field}>
                  <p className="text-sm text-muted-foreground">{getLabel(field)}</p>
                  {editMode ? (
                    <Input
                      type={field.includes("Date") ? "date" : "text"}
                      value={formData[field] || ""}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{employee[field]}</p>
                  )}
                </div>
              ))}

              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                {editMode ? (
                  <RadioGroup
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    className="flex gap-4 mt-1"
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
                ) : (
                  <p className="font-medium">{employee.gender}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {editMode ? (
                  <RadioGroup
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    className="flex gap-4 mt-1"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="Active" id="active" />
                      <Label htmlFor="active">Active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="Inactive" id="inactive" />
                      <Label htmlFor="inactive">Inactive</Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <p className="font-medium">{employee.status}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["dob", "fathersName", "pan", "personalEmail", "residentialAddress", "differentlyAbled"].map((field) => (
                <div key={field}>
                  <p className="text-sm text-muted-foreground">{getLabel(field)}</p>
                  {editMode ? (
                    <Input
                      type={field === "dob" ? "date" : "text"}
                      value={formData[field] || ""}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{employee[field]}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {["paymentMode", "accountHolderName", "bankName", "ifsc", "accountType"].map((field) => (
                <div key={field}>
                  <p className="text-sm text-muted-foreground">{getLabel(field)}</p>
                  {editMode ? (
                    <Input
                      value={formData[field] || ""}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{employee[field]}</p>
                  )}
                </div>
              ))}

              <div>
                <p className="text-sm text-muted-foreground">Account Number</p>
                {editMode ? (
                  <Input
                    value={formData.accountNumber || ""}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">
                    {showAccountNumber
                      ? employee.accountNumber
                      : maskAccountNumber(employee.accountNumber)}
                    <button
                      className="ml-2 text-blue-600 text-sm underline"
                      onClick={() => setShowAccountNumber((prev) => !prev)}
                    >
                      {showAccountNumber ? "Hide" : "Show A/C No"}
                    </button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {editMode && (
        <div className="flex justify-end">
          <Button className="px-6 py-2 text-md" onClick={handleUpdate}>
            💾 Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
