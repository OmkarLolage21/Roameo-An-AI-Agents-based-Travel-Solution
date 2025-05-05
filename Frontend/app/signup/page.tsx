"use client";
import Link from "next/link";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [user, setUser] = React.useState({
    email: "",
    password: "",
    username: "",
  });
  const [buttonDisabled, setButtonDisabled] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const onSignup = async () => {
    try {
      setLoading(true);
      const response = await axios.post("/api/auth/signup", user);
      toast.success("Signup Successfully")
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.email.length > 0 && user.password.length > 0 && user.username.length > 0) {
      setButtonDisabled(false);
    } else {
      setButtonDisabled(true);
    }
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-['Canela'] mb-6 text-center">{loading ? "Processing" : "Sign Up"}</h1>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className= "bg-white block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              className="bg-white p-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:border-gray-600 text-black"
              id="username"
              type="text"
              value={user.username}
              onChange={(e) => setUser({ ...user, username: e.target.value })}
              placeholder="Enter your username"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              className="bg-white p-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:border-gray-600 text-black"
              id="email"
              type="text"
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              placeholder="Enter your email"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              className="bg-white p-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:border-gray-600 text-black"
              id="password"
              type="password"
              value={user.password}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
              placeholder="Enter your password"
            />
          </div>
          <button
            onClick={onSignup}
            disabled={buttonDisabled}
            className={`w-full p-2 border rounded-lg text-white ${
              buttonDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {buttonDisabled ? "Sign Up Disabled" : "Sign Up"}
          </button>
          <div className="text-center mt-4">
            <Link href="/login" className="text-blue-600 hover:underline">
              Already have an account? Visit the login page
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}