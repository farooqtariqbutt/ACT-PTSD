import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useApp } from "../../context/AppContext";

import { getPCL5Interpretation } from "../../utils/assessmentUtils";

// ─── Constants for formatting ────────────────────────────────────────────────
const TRAUMA_LABELS: Record<string, string> = {
  deathOfLovedOne: "Threatening Death of Loved One",
  nearDeath: "Near Death Experience",
  seriousInjury: "Serious Injury",
  witnessedTrauma: "Witnessed Traumatic Incident Occurred to others",
  abuseEmotional: "Abuse (Emotional)",
  abusePhysical: "Abuse (Physical)",
  abuseSexual: "Abuse (Sexual)",
  naturalDisaster: "Natural Disaster (Flood / Earthquake)",
  warPoliticalViolence: "War / Political Violence",
  domesticViolence: "Domestic / Intimate Partner Violence",
  witnessedViolence: "Witnessing Violence at home / in the community",
  separationDivorce: "Separation / Divorce",
  cSection: "C-Section during Child Birth",
};

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastScore: number;
  trend: "up" | "down" | "stable";
  compliance: number;
  nextSession: string;
  risk: "High" | "Moderate" | "Low";
  hasRedFlags?: boolean;
  isOverdue?: boolean;
  frequency?: "once" | "twice" | "thrice";
  traumaHistory?: { type: string; age: string }[];
  demographics?: {
    age?: number;
    gender?: string;
    pronouns?: string;
    ethnicity?: string;
    maritalStatus?: string;
    education?: string;
    occupation?: string;
    employmentStatus?: string;
    livingSituation?: string;
    city?: string;
    primaryLanguage?: string;
    emergencyContact?: string;
    siblings?: number;
    birthOrder?: string;
    familySystem?: string;
    medicalDiseases?: string;
    psychIllness?: string;
    medication?: string;
    incomeRange?: string;
    earningMembers?: string;
    familyMedical?: string;
    familyPsych?: string;
    parentsRelation?: string;
  };
}

// ─── Component ──────────────────────────────────────────────────────────────
const TherapistClients: React.FC = () => {
  const { currentUser } = useApp();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All Risk Levels");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "" });
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/therapist/clients`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch clients");

      const data = await response.json();

      // Map the backend DB structure to our frontend UI interface
      const formattedPatients: Patient[] = data.map((client: any) => {
        // --- DYNAMIC SCORE LOGIC ---
        let score = client.currentClinicalSnapshot?.pcl5Total || 0; // Default fallback

        // Find all PCL-5 assessments in the client's history
        const pcl5Assessments = (client.assessmentHistory || []).filter(
          (a: any) => a.testType?.includes("PCL5")
        );

        if (pcl5Assessments.length > 0) {
          // Sort them by date to find the absolute newest one
          const latestPcl5 = pcl5Assessments.sort(
            (a: any, b: any) =>
              new Date(b.completedAt).getTime() -
              new Date(a.completedAt).getTime()
          )[0];

          // Use the newest score if it exists
          if (latestPcl5.totalScore !== undefined) {
            score = latestPcl5.totalScore;
          }
        } else if (
          client.postClinicalSnapshot &&
          client.postClinicalSnapshot.pcl5Total > 0
        ) {
          // Secondary fallback: if history array is somehow empty but post snapshot has a score
          score = client.postClinicalSnapshot.pcl5Total;
        }
        // ---------------------------

        // Format Trauma Data from DB structure to UI array
        const rawTrauma = client.traumaHistory || {};
        const formattedTrauma: { type: string; age: string }[] = [];

        for (const [key, val] of Object.entries(rawTrauma)) {
          // Check if it was marked true (handling both flat booleans and object wrappers depending on how it saved)
          if (
            val === true ||
            (val &&
              typeof val === "object" &&
              (val as any).experienced === true)
          ) {
            formattedTrauma.push({
              type: TRAUMA_LABELS[key] || key, // Fallback to raw key if not in label map
              age: (val as any).age || "Not specified",
            });
          }
        }

        // --- NEW RED FLAG LOGIC ---
        const redFlagAssessments = (client.assessmentHistory || []).filter(
          (a: any) => a.testType?.includes("REDFLAG")
        );
        let hasRedFlags = false;
        if (redFlagAssessments.length > 0) {
          const latestRedFlag = redFlagAssessments.sort(
            (a: any, b: any) =>
              new Date(b.completedAt).getTime() -
              new Date(a.completedAt).getTime()
          )[0];
          hasRedFlags =
            latestRedFlag.items?.some((item: any) => item.value === 1) || false;
        }

        let computedRisk: "High" | "Moderate" | "Low" = "Low";
        if (score > 50 || hasRedFlags) computedRisk = "High";
        else if (score > 30) computedRisk = "Moderate";

        let isOverdue = false;
        let formattedNextSession = "No Schedule Set";

        if (client.nextSessionDate) {
          const nextDateObj = new Date(client.nextSessionDate);
          const today = new Date();

          // Reset today's time to midnight for a fair day-to-day comparison
          today.setHours(0, 0, 0, 0);

          if (nextDateObj < today) {
            isOverdue = true;
          }

          formattedNextSession = nextDateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        }
        // --------------------------

        return {
          id: client._id,
          name: client.name || "Unknown Client",
          email: client.email || "N/A",
          phone: client.phoneNumber || "N/A",
          lastScore: score,
          trend: client.trend || "stable",
          compliance: client.complianceScore || 0,
          nextSession: formattedNextSession, // <-- UPDATED
          isOverdue: isOverdue,
          risk: computedRisk, // <-- UPDATED
          frequency: client.sessionFrequency || "once",
          traumaHistory: formattedTrauma,
          demographics: client.demographics || {},
          hasRedFlags: hasRedFlags, // <-- NEW
        };
      });

      setPatients(formattedPatients);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    const confirmDelete = window.confirm(
      `Are you sure it is necessary to permanently delete ${clientName}? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/therapist/clients/${clientId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete client");
      }

      // Optimistically remove the client from the UI without re-fetching
      setPatients((prevPatients) =>
        prevPatients.filter((p) => p.id !== clientId)
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddClient = async () => {
    if (!addForm.name || !addForm.email || !addForm.password) {
      setAddError("All fields are required.");
      return;
    }
    setIsAdding(true);
    setAddError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...addForm,
            role: "CLIENT",
            therapistId: (currentUser as any)?.id || (currentUser as any)?._id,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create client");
      setIsAddModalOpen(false);
      setAddForm({ name: "", email: "", password: "" });
      await fetchClients();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <i className="fa-solid fa-circle-notch animate-spin text-3xl text-indigo-600"></i>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600">
        <h3 className="font-bold mb-2">Error Loading Clients</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Client Roster
          </h2>
          <p className="text-sm text-slate-500">
            Manage and monitor your {patients.length} active patients.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <i className="fa-solid fa-user-plus mr-2"></i> Add New Client
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search by name, risk, or score..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 outline-none"
          >
            <option>All Risk Levels</option>
            <option>High Risk</option>
            <option>Moderate Risk</option>
            <option>Low Risk</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-50">
                <th className="px-8 py-5">Patient Name</th>
                <th className="px-8 py-5">Symptom Score (PCL-5)</th>
                <th className="px-8 py-5">App Compliance</th>
                <th className="px-8 py-5">Frequency</th>
                <th className="px-8 py-5">Risk Status</th>
                <th className="px-8 py-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(() => {
                const q = search.toLowerCase();
                const filtered = patients.filter(
                  (p) =>
                    (!q ||
                      p.name.toLowerCase().includes(q) ||
                      p.risk.toLowerCase().includes(q) ||
                      String(p.lastScore).includes(q)) &&
                    (riskFilter === "All Risk Levels" ||
                      p.risk === riskFilter.replace(" Risk", ""))
                );
                return filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-8 py-10 text-center text-slate-400 font-medium"
                    >
                      No clients currently assigned to you.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-sm">
                            {p.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)}
                          </div>
                          <div>
                            <NavLink
                              to={`/clients/${p.id}`}
                              className={`font-bold transition-colors flex items-center gap-2 ${
                                p.hasRedFlags
                                  ? "text-rose-600 hover:text-rose-700"
                                  : "text-slate-800 hover:text-indigo-600"
                              }`}
                            >
                              {p.name}
                              {p.hasRedFlags && (
                                <i
                                  className="fa-solid fa-triangle-exclamation text-rose-500"
                                  title="Active Safety Red Flags"
                                ></i>
                              )}
                            </NavLink>
                            <p
                              className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
                                p.isOverdue
                                  ? "text-amber-500 bg-amber-50 inline-block px-2 py-0.5 rounded-md"
                                  : "text-slate-400"
                              }`}
                            >
                              {p.isOverdue
                                ? `Overdue: ${p.nextSession}`
                                : p.nextSession === "No Schedule Set"
                                ? "No Schedule Set"
                                : `Next: ${p.nextSession}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-slate-700">
                              {p.lastScore}
                            </span>
                            {p.trend === "up" && (
                              <i className="fa-solid fa-arrow-trend-up text-rose-500 text-xs"></i>
                            )}
                            {p.trend === "down" && (
                              <i className="fa-solid fa-arrow-trend-down text-emerald-500 text-xs"></i>
                            )}
                            {p.trend === "stable" && (
                              <i className="fa-solid fa-minus text-slate-300 text-xs"></i>
                            )}
                          </div>
                          <span
                            className={`text-[8px] font-black uppercase tracking-widest ${
                              getPCL5Interpretation(p.lastScore).color
                            }`}
                          >
                            {getPCL5Interpretation(p.lastScore).text}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              p.compliance > 80
                                ? "bg-emerald-500"
                                : p.compliance > 50
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${p.compliance}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                          {p.compliance}% Active
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          {p.frequency || "once"} / week
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            p.risk === "High"
                              ? "bg-rose-50 text-rose-600 border border-rose-100"
                              : p.risk === "Moderate"
                              ? "bg-amber-50 text-amber-600 border border-amber-100"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          }`}
                        >
                          {p.risk} Risk
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedPatient(p);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="View Demographics & Trauma"
                          >
                            <i className="fa-solid fa-file-medical"></i>
                          </button>
                          <NavLink
                            to={`/clients/${p.id}`}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Detail"
                          >
                            <i className="fa-solid fa-eye"></i>
                          </NavLink>

                          <button
                            onClick={() => handleDeleteClient(p.id, p.name)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                            title="Delete Client"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">
                Add New Client
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddError("");
                }}
                className="w-9 h-9 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-all"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Client's full name"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="client@email.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Temporary Password
                </label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, password: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Set a temporary password"
                />
              </div>
              {addError && (
                <p className="text-xs text-rose-500 font-bold">{addError}</p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddError("");
                }}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClient}
                disabled={isAdding}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-60"
              >
                {isAdding ? (
                  <i className="fa-solid fa-circle-notch animate-spin"></i>
                ) : (
                  "Create Client"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isModalOpen && selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-all"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-black">
                {selectedPatient.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  {selectedPatient.name}
                </h3>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Pre-Assessment Results
                </p>
              </div>
            </div>

            <div className="space-y-10">
              {/* Section 1: Demographic sheet */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                    Section 1: Demographic sheet
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Full Name
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.name}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Preferred Pronouns
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.pronouns ||
                        "Not specified"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Age / Gender
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.age || "N/A"} /{" "}
                      {selectedPatient.demographics?.gender || "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Ethnicity / Race
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.ethnicity ||
                        "Not specified"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Marital Status
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.maritalStatus ||
                        "Not specified"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Primary Language
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.primaryLanguage ||
                        "English"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Email Address
                    </p>
                    <p
                      className="text-sm font-bold text-slate-800 truncate"
                      title={selectedPatient.email}
                    >
                      {selectedPatient.email}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Phone Number
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.phone}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      City / Location
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.city || "Not specified"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Education Level
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.education ||
                        "Not specified"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Occupation
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.occupation ||
                        "Not specified"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Employment Status
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.employmentStatus ||
                        "Not specified"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Living Situation
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.livingSituation ||
                        "Not specified"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Siblings
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.siblings ?? "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Birth Order
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.birthOrder ||
                        "Not specified"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Family System
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.familySystem || "Nuclear"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Income Range
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.incomeRange ||
                        "Not specified"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Earning Members
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.earningMembers ||
                        "Not specified"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2 lg:col-span-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Emergency Contact
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedPatient.demographics?.emergencyContact ||
                        "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center text-sm">
                      <i className="fa-solid fa-notes-medical"></i>
                    </div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      Medical & Psychological History
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Medical Diseases
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {selectedPatient.demographics?.medicalDiseases ||
                          "None reported"}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Psychological Illness
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {selectedPatient.demographics?.psychIllness ||
                          "None reported"}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Medication in use
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {selectedPatient.demographics?.medication ||
                          "None reported"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center text-sm">
                      <i className="fa-solid fa-users"></i>
                    </div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      Family History & Relations
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Family Medical History
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {selectedPatient.demographics?.familyMedical ||
                          "None reported"}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Family Psychological History
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {selectedPatient.demographics?.familyPsych ||
                          "None reported"}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Parent's Relation Status
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {selectedPatient.demographics?.parentsRelation ||
                          "Living Together"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Trauma History */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 bg-rose-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                    Section 2: Trauma History
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {selectedPatient.traumaHistory &&
                  selectedPatient.traumaHistory.length > 0 ? (
                    selectedPatient.traumaHistory.map((trauma, idx) => (
                      <div
                        key={idx}
                        className="p-5 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-between group hover:bg-rose-100/50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white text-rose-500 rounded-2xl flex items-center justify-center text-sm shadow-sm">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                          </div>
                          <div>
                            <p className="text-sm font-black text-rose-900 tracking-tight">
                              {trauma.type}
                            </p>
                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                              Reported Trauma
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-0.5">
                            Age at Event
                          </p>
                          <div className="bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg shadow-rose-200">
                            {trauma.age}{" "}
                            {trauma.age !== "Not specified" && "Years Old"}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-slate-100 border-dashed rounded-2xl">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        No trauma history recorded
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-10 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapistClients;
