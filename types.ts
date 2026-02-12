
export enum UserRole {
  CLIENT = 'CLIENT',
  THERAPIST = 'THERAPIST',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export type SubscriptionPlan = 'Basic' | 'Professional' | 'Enterprise';

export type SchedulePreference = 'MonThu' | 'TueFri' | 'WedSat';

export interface SessionData {
  sessionNumber: number;
  stepId: string;
  stepTitle?: string;
  inputValue: any;
  timestamp: string;
}

export interface SessionResult {
  sessionNumber: number;
  timestamp: string;
  moodBefore: number;
  moodAfter?: number;
  reflections: Record<string, any>;
  completed: boolean;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  clinicId?: string;
  currentSession?: number; // 1-12
  assignedTherapistId?: string;
  prescribedSessions?: number[]; // indices of sessions (0-11)
  profileImage?: string; // base64 or URL
  phoneNumber?: string;
  hasConsented?: boolean;
  consentTimestamp?: string; // ISO format
  schedulePreference?: SchedulePreference;
  assessmentScores?: {
    mood: number;
    pcl5: number;
    emotionalDysregulation: number;
    aaq: number;
    timestamp: string;
  };
  sessionHistory?: SessionResult[];
  sessionData?: SessionData[];
}

export interface TherapySession {
  number: number;
  title: string;
  description: string;
  objective: string;
  moduleKey: string;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  contactEmail: string;
  plan: SubscriptionPlan;
  status: 'Live' | 'Setup' | 'Review';
  usersCount: number;
  revenue?: number;
  retentionRate?: number;
}

export interface LifeDomain {
  id: string;
  name: string;
  icon: string;
  value: string;
  action: string;
}

export interface DefusionTechnique {
  name: string;
  description: string;
  exercise: string;
}

export type ImageSize = '1K' | '2K' | '4K';

export const THERAPY_SESSIONS = [
  { number: 1, title: 'Creative Hopelessness', description: 'Examining the agenda of control and opening up to a new way of relating to pain.', objective: 'Identify "workability" of current coping strategies.', moduleKey: 'ch' },
  { number: 2, title: 'Acceptance', description: 'Learning to drop the struggle with difficult emotions and sensations.', objective: 'Practice the "Making Room" exercise.', moduleKey: 'acc' },
  { number: 3, title: 'Diffusion 1', description: 'Starting to see thoughts as just thoughts, rather than objective truths.', objective: 'Learn basic cognitive defusion techniques.', moduleKey: 'def1' },
  { number: 4, title: 'Diffusion 2', description: 'Advanced defusion for deeply held beliefs and intrusive PTSD memories.', objective: 'Apply the "Labeling the Story" technique to specific triggers.', moduleKey: 'def2' },
  { number: 5, title: 'Present Moment', description: 'Grounding yourself in the here and now through mindfulness.', objective: 'Complete a focused grounding and awareness scan.', moduleKey: 'pm' },
  { number: 6, title: 'Values & Clarification 1', description: 'Exploring what truly matters in different domains of your life.', objective: 'Complete the initial Values Compass assessment.', moduleKey: 'val1' },
  { number: 7, title: 'Values & Clarification 2', description: 'Refining your life direction and identifying specific value-led goals.', objective: 'Draft 3 committed actions aligned with core values.', moduleKey: 'val2' },
  { number: 8, title: 'Exposure Through Values', description: 'Moving toward difficult situations while staying connected to your values.', objective: 'Create a value-based exposure hierarchy.', moduleKey: 'exp' },
  { number: 9, title: 'Trauma Narrative', description: 'Integrating the past into a coherent story of growth and resilience.', objective: 'Begin processing traumatic memories with a values-lens.', moduleKey: 'trauma' },
  { number: 10, title: 'Grief & Forgiveness', description: 'Processing loss and practicing compassion for yourself and others.', objective: 'Practice self-compassion and forgiveness meditations.', moduleKey: 'grief' },
  { number: 11, title: 'Moral Injury', description: 'Addressing wounds to the soul and navigating complex feelings of guilt.', objective: 'Identify moral conflict points and apply ACT flexibility.', moduleKey: 'moral' },
  { number: 12, title: 'Relapse Prevention', description: 'Building a sustainable plan for long-term psychological flexibility.', objective: 'Create a "Flexibility Survival Kit" for future stressors.', moduleKey: 'relapse' },
];
