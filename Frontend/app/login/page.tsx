"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    try {
      setLoading(true);
      const response = await axios.post("/api/auth/login", { email, password });
      if (response.data.success) {
        toast.success("Login successful!");
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      const errorMessage = error.response?.data?.error || error.message || "Login failed. Please check your credentials.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (email.length > 0 && password.length > 0) {
      setButtonDisabled(false);
    } else {
      setButtonDisabled(true);
    }
  }, [email, password]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-['Canela'] mb-6 text-center">
          {loading ? "Processing" : "Welcome Back"}
        </h1>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              className="w-full"
              disabled={buttonDisabled || loading}
              onClick={onLogin}
            >
              {loading ? "Loading..." : "Login"}
            </Button>
          </div>
        </form>
        <div className="mt-4 text-center">
          <a
            href="../signup"
            className="text-blue-500 hover:underline"
          >
            Visit Signup Page
          </a>
        </div>
      </div>
    </div>
  );
}