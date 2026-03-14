const API_URL = import.meta.env.VITE_API_BASE_URL;

interface SaveAssessmentPayload {
  templateId: string;
  testType: string;
  totalScore: number;
  interpretation: string;
  phase?: 'PRE' | 'POST'; // <-- ADD THIS
  items: Array<{
    questionId: string;
    questionText: string;
    value: number;
    label: string;
  }>;
}

export const saveAssessment = async (payload: SaveAssessmentPayload) => {
  const token = localStorage.getItem("token");
  const fullUrl = `${API_URL}/assessments/submit`;
  
  console.log("Attempting POST to:", fullUrl); // DEBUG LOG

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Server Error Data:", errorData);
    throw new Error(errorData.message || 'Failed to save assessment');
  }
  
  return response.json();
};
