import { useState } from "react";
import { Code2 } from "lucide-react";

interface Props {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async () => {
    try {
      const endpoint = isRegistering ? "register" : "login";
      const res = await fetch(`http://localhost:4000/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      if (isRegistering) {
        setIsRegistering(false);
        setError("Registration successful! Please log in.");
        return;
      }

      localStorage.setItem("skillforge:token", data.token);
      onLogin(data.token);
    } catch {
      setError("Server error");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-lg">
          <Code2 className="text-white" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">SkillForge AI</h1>
      </div>

      <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
        {isRegistering ? "Create Account" : "Sign In"}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            placeholder="Enter your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-lg font-medium hover:shadow-lg transition-all"
        >
          {isRegistering ? "Register" : "Login"}
        </button>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {isRegistering ? "Already have an account? Login" : "Don't have an account? Register"}
        </button>
      </div>

      {error && (
        <p className={`mt-4 text-sm text-center ${error.includes("successful") ? "text-green-600" : "text-red-600"}`}>
          {error}
        </p>
      )}
    </div>
  );
}