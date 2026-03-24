
export const getPDEQInterpretation = (score: number) => {
  if (score <= 15) return { text: "Low peritraumatic dissociation", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" };
  if (score <= 27) return { text: "Mild dissociation", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100" };
  return { text: "High dissociation", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" };
};

export const getPCL5Interpretation = (score: number) => {
  if (score < 33) return { text: "Normal", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" };
  if (score <= 51) return { text: "Mild", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100" };
  return { text: "Severe", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" };
};

export const getDERSInterpretation = (score: number) => {
  if (score <= 35) return { text: "Low emotion dysregulation", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" };
  if (score <= 53) return { text: "Mild emotion dysregulation", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100" };
  if (score <= 71) return { text: "Moderate emotion dysregulation", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" };
  return { text: "Severe emotion dysregulation", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" };
};

export const getAAQInterpretation = (score: number) => {
  if (score <= 20) return { text: "Low psychological inflexibility (high flexibility)", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" };
  if (score <= 30) return { text: "Mild psychological inflexibility", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100" };
  if (score <= 40) return { text: "Moderate psychological inflexibility", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" };
  return { text: "High / severe psychological inflexibility", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" };
};
