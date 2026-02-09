import { useState } from "react";
import { Code2 } from "lucide-react";
import PlacementQuiz from "./PlacementQuiz";

// TYPES
    

interface AuthPayload {
  token: string;
  role: "student" | "admin";
}

interface Props {
  onLogin: (auth: AuthPayload) => void;
}

// LOGIN COMPONENT
    

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [isRegistering, setIsRegistering] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  // Temporarily store credentials during placement quiz
  const [tempCredentials, setTempCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // LOGIN / REGISTER
      

  const handleSubmit = async () => {
    setError("");

    // Registration, Placement Quiz
    if (isRegistering && !showQuiz) {
      if (!email || !password) {
        setError("Please enter both email and password.");
        return;
      }

      setTempCredentials({ email, password });
      setShowQuiz(true);
      return;
    }

    // Normal login
    try {
      const res = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid login credentials.");
        return;
      }

      const auth: AuthPayload = {
        token: data.token,
        role: data.role || "student",
      };

localStorage.setItem("skillforge:token", JSON.stringify(auth));
      onLogin(auth); //pass full auth object
    } catch {
      setError("Server error. Please check if the backend is running.");
    }
  };

  // PLACEMENT QUIZ COMPLETE
      

  const handleQuizComplete = async (level: string) => {
    if (!tempCredentials) {
      setError("Registration session expired. Please try again.");
      setShowQuiz(false);
      return;
    }

    try {
      // Register user with skill level
      const registerRes = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: tempCredentials.email,
          password: tempCredentials.password,
          skillLevel: level,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        setError(registerData.message || "Registration failed.");
        setShowQuiz(false);
        return;
      }

      // Auto-login after registration
      const loginRes = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: tempCredentials.email,
          password: tempCredentials.password,
        }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        setError("Login failed after registration.");
        return;
      }

      const auth: AuthPayload = {
        token: loginData.token,
        role: loginData.role || "student",
      };

localStorage.setItem("skillforge:token", JSON.stringify(auth));
      onLogin(auth); // pass full auth object
    } catch {
      setError("Failed to complete registration.");
    }
  };

  // UI
      

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {showQuiz ? (
        <PlacementQuiz onComplete={handleQuizComplete} />
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-lg">
              <Code2 className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              SkillForge AI
            </h1>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            {isRegistering ? "Create Account" : "Sign In"}
          </h2>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-lg font-medium hover:shadow-lg transition"
            >
              {isRegistering ? "Continue to Quiz" : "Login"}
            </button>

            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              className="w-full text-sm text-indigo-600 font-medium"
            >
              {isRegistering
                ? "Already have an account? Login"
                : "Don't have an account? Register"}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-center text-red-600">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
