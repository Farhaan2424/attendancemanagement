import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const { setUser } = useUser();

  const API_BASE_URL = "http://localhost:1337/api";

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        login(data.jwt, data.user);
        setUser(data.user);

        toast({
          title: "Login Successful!",
          description: `Welcome, ${data.user.username} (${data.user.role?.name})`,
          variant: "default",
        });

        navigate("/");
      } else {
        toast({
          title: "Login Failed",
          description: data.error?.message || "An unexpected error occurred.",
          variant: "destructive",
        });
        console.error("Login Error:", data);
      }
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      });
      console.error("Login Network Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Registration Successful!",
          description: "Your account has been created. An administrator will assign your role.",
          variant: "default",
        });

        setIsLogin(true);
        setUsername("");
        setEmail("");
        setPassword("");
      } else {
        toast({
          title: "Registration Failed",
          description: data.error?.message || "An unexpected error occurred.",
          variant: "destructive",
        });
        console.error("Registration Error:", data);
      }
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      });
      console.error("Registration Network Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md rounded-lg shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-bold text-gray-800">
            {isLogin ? "Login" : "Register"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
            {!isLogin && (
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Your Username"
                  value={username}
                  required
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isLogin ? (
                "Login"
              ) : (
                "Register"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <Button variant="link" onClick={() => setIsLogin(false)} className="p-0 h-auto">
                  Register
                </Button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Button variant="link" onClick={() => setIsLogin(true)} className="p-0 h-auto">
                  Login
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
