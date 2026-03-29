import React, { useEffect, useState } from "react";
import { UserRole } from "../../../types";

interface AuthFlowProps {
  onLogin: (
    roleOrKey: string,
    userData?: any,
    isNewRegistration?: boolean
  ) => void;
}

type AuthStep = "login" | "signup" | "role-select" | "mfa";
type MfaOrigin = "login" | "signup";

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const AuthFlow: React.FC<AuthFlowProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [step, setStep] = useState<AuthStep>("login");
  const [mfaOrigin, setMfaOrigin] = useState<MfaOrigin>("login");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [mfaCode, setMfaCode] = useState(["", "", "", "", "", ""]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Countdown timer for MFA resend button
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "mfa" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const startMfaTimer = () => {
    setResendTimer(60);
    setCanResend(false);
  };

  // ─── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Login failed");

      

      startMfaTimer();
      setMfaOrigin("login");
      setStep("mfa");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Signup — fires immediately when a role card is clicked ──────────────
  const handleSignup = async (role: UserRole) => {
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, role }),
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Registration failed");

    

      startMfaTimer();
      setMfaOrigin("signup");
      setStep("mfa");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── MFA Verify ───────────────────────────────────────────────────────────
  const handleVerifyMfa = async () => {
    setError("");
    setIsLoading(true);

    const code = mfaCode.join("");
    const userEmail = mfaOrigin === "login" ? email : formData.email;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/verify-mfa`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, code }),
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Invalid MFA code");

      localStorage.setItem("token", data.token);

      if (data.user) {
        const userId = data.user._id || data.user.id;
        const isNewRegistration = mfaOrigin === "signup";
        onLogin(userId, data.user, isNewRegistration);
      } else {
        onLogin(data.role || selectedRole || UserRole.CLIENT);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── MFA input handler ────────────────────────────────────────────────────
  const handleMfaChange = (index: number, value: string) => {
    if (/^\d*$/.test(value) && value.length <= 1) {
      const newCode = [...mfaCode];
      newCode[index] = value;
      setMfaCode(newCode);
      if (value && index < 5) {
        (
          document.getElementById(`mfa-${index + 1}`) as HTMLInputElement
        )?.focus();
      }
    }
  };

  // ─── Resend MFA Code ──────────────────────────────────────────────────────
  const handleResendCode = async () => {
    setError("");
    setIsLoading(true);

    // Grab the correct credentials depending on how they reached the MFA screen
    const targetEmail = mfaOrigin === "login" ? email : formData.email;
    const targetPassword = mfaOrigin === "login" ? password : formData.password;

    try {
      // Calling the login endpoint is the correct approach here, as it will 
      // validate the password, generate a new code, and trigger the MFA email.
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetEmail, password: targetPassword }),
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Failed to resend code");


      // Reset the input boxes and restart the timer
      setMfaCode(["", "", "", "", "", ""]);
      startMfaTimer();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render steps ─────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case "login":
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                Welcome Back
              </h2>
              <p className="text-slate-500 text-sm mt-2">
                Sign in to your clinical workspace
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && isValidEmail(email) && handleLogin()
                  }
                  className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    email && !isValidEmail(email)
                      ? "border-rose-500"
                      : "border-slate-200"
                  }`}
                />
                {email && !isValidEmail(email) && (
                  <p className="text-xs text-rose-500 ml-1">
                    Please enter a valid email.
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Password
                  </label>
                  <button className="text-[10px] font-bold text-indigo-600 hover:underline">
                    Forgot?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  min={6}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoading || !email || !password || (email.length > 0 && !isValidEmail(email))}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-70"
            >
              {isLoading ? "Authenticating..." : "Sign In"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-white px-4 text-slate-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <i className="fa-brands fa-google text-rose-500"></i>
                <span className="text-sm font-bold text-slate-700">Google</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <i className="fa-brands fa-apple text-slate-900"></i>
                <span className="text-sm font-bold text-slate-700">Apple</span>
              </button>
            </div>

            <p className="text-center text-sm text-slate-500">
              Don't have an account?{" "}
              <button
                onClick={() => {
                  setError("");
                  setStep("signup");
                }}
                className="text-indigo-600 font-bold hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        );

      case "signup":
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                Create Account
              </h2>
              <p className="text-slate-500 text-sm mt-2">
                Start your journey to flexibility
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="name@example.com"
                  className={`w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    formData.email && !isValidEmail(formData.email) ? "border-rose-500" : "border-slate-200"
                  }`}
                />
                {formData.email && !isValidEmail(formData.email) && (
    <p className="text-xs text-rose-500 ml-1">Please enter a valid email.</p>
  )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                  min={6}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <button
              onClick={() => {
                setError("");
                setStep("role-select");
              }}
              disabled={!formData.name || !formData.email || !formData.password || (formData.email.length > 0 && !isValidEmail(formData.email))}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              Continue
            </button>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <button
                onClick={() => {
                  setError("");
                  setStep("login");
                }}
                className="text-indigo-600 font-bold hover:underline"
              >
                Log in
              </button>
            </p>
          </div>
        );

      case "role-select":
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800">
                Identify Your Role
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Select the account type that fits you
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

<div className="grid gap-4">
  {[
    {
      role: UserRole.CLIENT,
      title: "I am a Patient",
      desc: "Seeking self-guided tools and therapist connection.",
      icon: "fa-user",
    },
    {
      role: UserRole.THERAPIST,
      title: "I am a Therapist",
      desc: "Licensed professional managing clinical caseloads.",
      icon: "fa-user-doctor",
    },
    {
      role: UserRole.ADMIN,
      title: "Clinic Administrator",
      desc: "Managing a facility or group practice.",
      icon: "fa-hospital",
    },
  ].map((opt) => {
    // Determine if this specific role is disabled
    const isRoleDisabled = opt.role !== UserRole.CLIENT || isLoading;

    return (
      <button
        key={opt.role}
        onClick={() => {
          setSelectedRole(opt.role);
          handleSignup(opt.role);
        }}
        // Disable anything that isn't the Patient role
        disabled={isRoleDisabled}
        className={`w-full p-6 bg-white border-2 rounded-3xl transition-all text-left flex gap-6 items-center group 
          ${isRoleDisabled 
            ? "opacity-50 cursor-not-allowed border-slate-50" // Styles for disabled roles
            : "border-slate-100 hover:border-indigo-500 hover:shadow-lg cursor-pointer" // Styles for clickable Patient
          }`}
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-colors 
          ${isRoleDisabled 
            ? "bg-slate-50 text-slate-300" 
            : "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
          }`}
        >
          {isLoading && selectedRole === opt.role ? (
            <i className="fa-solid fa-circle-notch animate-spin text-indigo-500"></i>
          ) : (
            <i className={`fa-solid ${opt.icon}`}></i>
          )}
        </div>
        <div>
          <h3 className={`font-bold text-lg ${isRoleDisabled ? "text-slate-400" : "text-slate-800"}`}>
            {opt.title}
            {opt.role !== UserRole.CLIENT && (
              <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded uppercase tracking-tighter">Coming Soon</span>
            )}
          </h3>
          <p className={`text-sm ${isRoleDisabled ? "text-slate-400" : "text-slate-500"}`}>
            {opt.desc}
          </p>
        </div>
      </button>
    );
  })}
</div>

            <button
              onClick={() => {
                setError("");
                setStep("signup");
              }}
              disabled={isLoading}
              className="w-full text-center text-sm font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest disabled:opacity-50"
            >
              Back to info
            </button>
          </div>
        );

      case "mfa":
        return (
          <div className="space-y-8 animate-in scale-in duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6">
                <i className="fa-solid fa-shield-check"></i>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">
                Two-Factor Authentication
              </h2>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                We've sent a 6-digit code to{" "}
                <span className="font-bold text-slate-700">
                  {mfaOrigin === "login" ? email : formData.email}
                </span>
              </p>
            </div>

            <div className="flex justify-between gap-2 max-w-xs mx-auto">
              {mfaCode.map((val, i) => (
                <input
                  key={i}
                  id={`mfa-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={val}
                  onChange={(e) => handleMfaChange(i, e.target.value)}
                  className="w-12 h-14 text-center text-xl font-black bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-600 outline-none transition-colors"
                />
              ))}
            </div>

            <div className="space-y-4">
              <button
                onClick={handleVerifyMfa}
                disabled={isLoading || mfaCode.includes("")}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-70"
              >
                {isLoading ? "Verifying..." : "Verify & Enter"}
              </button>

              <button
  onClick={handleResendCode}
  disabled={!canResend || isLoading}
  className={`w-full text-center text-sm font-bold uppercase tracking-widest transition-colors ${
    canResend
      ? "text-indigo-600 hover:text-indigo-800 cursor-pointer"
      : "text-slate-400 cursor-not-allowed"
  }`}
>
  {canResend ? "Resend Code" : `Resend code in ${resendTimer}s`}
</button>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm text-rose-700 text-center">{error}</p>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>

      <div className="w-full max-w-md relative">
        <div className="bg-white/80 backdrop-blur-2xl p-6 md:p-12 rounded-[2.5rem] md:rounded-[2.5rem] shadow-2xl border border-white/50 relative z-10">
          <div className="flex items-center gap-3 justify-center mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl">
              <i className="fa-solid fa-heart-pulse"></i>
            </div>
            <span className="text-2xl font-black text-slate-800 tracking-tight">
              ACT Path
            </span>
          </div>
          {renderStep()}
        </div>

        <div className="mt-8 flex justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <a href="#" className="hover:text-slate-600">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-slate-600">
            Terms of Service
          </a>
          <a href="#" className="hover:text-slate-600">
            Help Center
          </a>
        </div>
      </div>
    </div>
  );
};

export default AuthFlow;