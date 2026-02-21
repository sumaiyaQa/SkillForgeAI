import { useState } from "react";
import { Code2, ShieldCheck, UserIcon } from "lucide-react";
import PlacementQuiz from "../student/PlacementQuiz";

// TYPES
    

interface AuthPayload {
  email: string;
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
  const [role, setRole] = useState<"student" | "admin">("student");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");

  const [isRegistering, setIsRegistering] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [tempCredentials, setTempCredentials] = useState<any>(null);

  const handleSubmit = async () => {
    setError("");

    // REGISTRATION LOGIC
    if (isRegistering) {
      if (!email || !password) {
        setError("Please enter both email and password.");
        return;
      }

      if (role === "admin") {
        if (!adminKey) {
          setError("Admin key is required for instructor registration.");
          return;
        }
        // Direct Registration for Admins (Skip Quiz)
        await handleFinalRegistration("expert"); 
      } else {
        // Students go to Quiz
        setTempCredentials({ email, password, role: "student" });
        setShowQuiz(true);
      }
      return;
    }

    // LOGIN LOGIC
    try {
      const res = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      const auth: AuthPayload = {
        token: data.token,
        role: data.role,
        email: email
      };

      localStorage.setItem("skillforge:auth", JSON.stringify(auth));
      onLogin(auth);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFinalRegistration = async (level: string) => {
    const creds = isRegistering && role === "admin" 
      ? { email, password, role, adminKey } 
      : { ...tempCredentials, skillLevel: level };

    try {
      const registerRes = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) throw new Error(registerData.message);

      // Auto-login
      const loginRes = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: creds.email, password: creds.password }),
      });

      const loginData = await loginRes.json();
      const auth = { token: loginData.token, role: loginData.role, email: creds.email };
      localStorage.setItem("skillforge:auth", JSON.stringify(auth));
      onLogin(auth);
    } catch (err: any) {
      setError(err.message);
      setShowQuiz(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {showQuiz ? (
        <PlacementQuiz onComplete={handleFinalRegistration} />
      ) : (
        <div className="bg-white rounded-xl shadow-lg border p-8 w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-lg">
              <Code2 className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SkillForge AI</h1>
          </div>

          {/* Role Switcher (Registration Only) */}
          {isRegistering && (
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button
                onClick={() => setRole("student")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${role === "student" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}
              >
                <UserIcon size={16} /> Student
              </button>
              <button
                onClick={() => setRole("admin")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${role === "admin" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}
              >
                <ShieldCheck size={16} /> Instructor
              </button>
            </div>
          )}

          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {isRegistering && role === "admin" && (
              <input
                type="password"
                value={adminKey}
                onChange={e => setAdminKey(e.target.value)}
                placeholder="Admin Secret Key"
                className="w-full px-4 py-2 border-2 border-indigo-100 bg-indigo-50 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}

            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-lg font-medium"
            >
              {isRegistering ? (role === "admin" ? "Register Admin" : "Continue to Quiz") : "Login"}
            </button>

            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(""); }}
              className="w-full text-sm text-indigo-600 font-medium"
            >
              {isRegistering ? "Already have an account? Login" : "Don't have an account? Register"}
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-center text-red-600 font-medium">{error}</p>}
        </div>
      )}
    </div>
  );
}