import { getPCL5Interpretation,getAAQInterpretation,getDERSInterpretation,getPDEQInterpretation } from "./assessmentUtils";

export const getInterpretationText = (testType: string, score: number): string => {
    switch (testType.toUpperCase()) {
      case 'PDEQ':
        return getPDEQInterpretation(score).text;
      case 'PCL5':
        return getPCL5Interpretation(score).text; // Extract just the string for the DB
      case 'DERS18':
        return getDERSInterpretation(score).text;
      case 'AAQ':
        return getAAQInterpretation(score).text;
      default:
        return "No interpretation available";
    }
  };