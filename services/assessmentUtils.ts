
export const getPDEQInterpretation = (score: number) => {
  if (score <= 15) return "Low peritraumatic dissociation";
  if (score <= 27) return "Mild dissociation";
  return "High dissociation";
};

export const getPCL5Interpretation = (score: number) => {
  if (score < 33) return { text: "Normal", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" };
  if (score <= 51) return { text: "Mild", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100" };
  return { text: "Severe", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" };
};

export const getDERSInterpretation = (score: number) => {
  if (score <= 35) return "Low emotion dysregulation";
  if (score <= 53) return "Mild emotion dysregulation";
  if (score <= 71) return "Moderate emotion dysregulation";
  return "Severe emotion dysregulation";
};

export const getAAQInterpretation = (score: number) => {
  if (score <= 20) return "Low psychological inflexibility (high flexibility)";
  if (score <= 30) return "Mild psychological inflexibility";
  if (score <= 40) return "Moderate psychological inflexibility";
  return "Severe psychological inflexibility";
};
