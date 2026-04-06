import { useState } from "react";
import PlacementQuiz from "../student/PlacementQuiz";

type SkillLevel = "beginner" | "intermediate" | "advanced";

interface AuthPayload {
  email: string;
  token: string;
  role: "student" | "admin";
  quizResult?: { level: SkillLevel; conceptPriors: Record<string, number> };
}

interface Props {
  onLogin: (auth: AuthPayload) => void;
}

interface TempCredentials {
  email: string;
  password: string;
  role: "student";
}

const API_BASE = "http://localhost:4000";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "admin">("student");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");

  const [isRegistering, setIsRegistering] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [tempCredentials, setTempCredentials] = useState<TempCredentials | null>(null);

  const handleSubmit = async () => {
    setError("");

    // Registration path: students continue to quiz, admins register directly.
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
        await handleFinalRegistration({ level: "beginner", conceptPriors: {} });
      } else {
        setTempCredentials({ email, password, role: "student" });
        setShowQuiz(true);
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
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

      onLogin(auth);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleFinalRegistration = async (result: { level: SkillLevel; conceptPriors: Record<string, number> }) => {
    const creds = isRegistering && role === "admin"
      ? { email, password, role, adminKey }
      : { ...tempCredentials, skillLevel: result.level };

    if (!creds || !creds.email || !creds.password) {
      setError("Missing registration details. Please try again.");
      setShowQuiz(false);
      return;
    }

    try {
      const registerRes = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) throw new Error(registerData.message);

      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: creds.email, password: creds.password }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.message || "Login after registration failed");

      const auth = { token: loginData.token, role: loginData.role, email: creds.email, quizResult: result };
      onLogin(auth);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setShowQuiz(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {showQuiz ? (
        <PlacementQuiz onComplete={handleFinalRegistration} />
      ) : (
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">SkillForge AI</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isRegistering ? "Create your account" : "Sign in to continue"}
            </p>
          </div>

          {isRegistering && (
            <div className="mb-6 flex rounded-md border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setRole("student")}
                className={`flex-1 rounded px-3 py-2 text-sm font-medium transition ${role === "student" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"}`}
              >
                Student
              </button>
              <button
                onClick={() => setRole("admin")}
                className={`flex-1 rounded px-3 py-2 text-sm font-medium transition ${role === "admin" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"}`}
              >
                Instructor
              </button>
            </div>
          )}

          <div className="space-y-4">
            {/* Keep labels visible for accessibility and cleaner form structure. */}
            <label htmlFor="login-email" className="block text-xs font-medium text-slate-600">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            <label htmlFor="login-password" className="block text-xs font-medium text-slate-600">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            {isRegistering && role === "admin" && (
              <>
                <label htmlFor="admin-secret-key" className="block text-xs font-medium text-slate-600">
                  Admin Secret Key
                </label>
                <input
                  id="admin-secret-key"
                  type="password"
                  value={adminKey}
                  onChange={e => setAdminKey(e.target.value)}
                  placeholder="Enter admin key"
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </>
            )}

            <button
              onClick={handleSubmit}
              className="w-full rounded-md bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {isRegistering ? (role === "admin" ? "Register Admin" : "Continue to Quiz") : "Login"}
            </button>

            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(""); }}
              className="w-full text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {isRegistering ? "Already have an account? Login" : "Don't have an account? Register"}
            </button>
          </div>
          {error && <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>
      )}
    </div>
  );
}