import { getPCL5Interpretation,getAAQInterpretation,getDERSInterpretation,getPDEQInterpretation } from "./assessmentUtils";

export const getInterpretationText = (testType: string, score: number): string => {
    switch (testType.toUpperCase()) {
      case 'PDEQ':
        return getPDEQInterpretation(score);
      case 'PCL5':
        return getPCL5Interpretation(score).text; // Extract just the string for the DB
      case 'DERS18':
        return getDERSInterpretation(score);
      case 'AAQ':
        return getAAQInterpretation(score);
      default:
        return "No interpretation available";
    }
  };