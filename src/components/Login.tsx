import { useState } from "react";
import { Code2 } from "lucide-react";
import PlacementQuiz from "./PlacementQuiz"; // Make sure the path is correct

interface Props {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [tempData, setTempData] = useState({ email: '', password: '' });

  const handleSubmit = async () => {
    setError(""); // Clear previous errors

    if (isRegistering && !showQuiz) {
      // Validate inputs before showing quiz
      if (!email || !password) {
        setError("Please enter both email and password.");
        return;
      }
      setTempData({ email, password });
      setShowQuiz(true);
      return;
    }

    try {
      const endpoint = isRegistering ? "register" : "login";
      const res = await fetch(`http://localhost:4000/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong");
        return;
      }

      localStorage.setItem("skillforge:token", data.token);
      onLogin(data.token);
    } catch {
      setError("Server error. Please check if the backend is running.");
    }
  };

 const handleQuizComplete = async (level: string) => {
  try {
    const res = await fetch(`http://localhost:4000/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email: tempData.email, 
        password: tempData.password, 
        skillLevel: level 
      }),
    });

    if (res.ok) {
      // After registration, log them in automatically with the right level
      const loginRes = await fetch(`http://localhost:4000/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tempData.email, password: tempData.password }),
      });
      const loginData = await loginRes.json();
      
      localStorage.setItem("skillforge:token", loginData.token);
      
      // IMPORTANT: Pass the token to the parent so App.tsx can fetch the new 'advanced' profile
      onLogin(loginData.token); 
    }
  } catch (err) {
    setError("Failed to sync level.");
  }
};

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {showQuiz ? (
        <PlacementQuiz onComplete={handleQuizComplete} />
      ) : (
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
              <input 
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              {isRegistering ? "Continue to Quiz" : "Login"}
            </button>

            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
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
      )}
    </div>
  );
}