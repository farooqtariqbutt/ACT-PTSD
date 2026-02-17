const API_URL = import.meta.env.VITE_API_BASE_URL;

export const saveAssessment = async (payload: {
  templateId: string;
  testType: string;
  items: any[];
  totalScore: number;
}) => {
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
