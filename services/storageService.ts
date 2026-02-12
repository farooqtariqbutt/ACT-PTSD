
import { User, UserRole, SessionResult, SessionData } from '../types';

const STORAGE_KEY = 'act_path_db_users';

/**
 * A singleton service acting as the primary Data Access Layer (DAL)
 * for the application. It simulates a database by using LocalStorage
 * with role-based isolation.
 */
export class StorageService {
  private static instance: StorageService;

  private constructor() {
    this.initializeDefaultData();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private initializeDefaultData() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const initialUsers: Record<string, User> = {
        'CLIENT': { 
          id: 'c1', 
          name: 'Alex Johnson', 
          role: UserRole.CLIENT, 
          email: 'alex@example.com', 
          clinicId: 'clinic-1', 
          phoneNumber: '+1 (555) 012-3456', 
          hasConsented: false,
          sessionData: []
        },
        'TEST_CLIENT': { 
          id: 'test-c', 
          name: 'Clinical Test Account', 
          role: UserRole.CLIENT, 
          email: 'test@actpath.com', 
          clinicId: 'clinic-1', 
          phoneNumber: '+1 (555) 777-8888', 
          hasConsented: true,
          consentTimestamp: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
          schedulePreference: 'MonThu',
          currentSession: 2,
          assessmentScores: {
            mood: 3,
            pcl5: 42,
            emotionalDysregulation: 65,
            aaq: 28,
            timestamp: new Date().toISOString()
          },
          sessionHistory: [
            {
              sessionNumber: 1,
              timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
              moodBefore: 3,
              moodAfter: 4,
              reflections: { q1: "Avoided crowds", q4: "Peace of mind" },
              completed: true
            }
          ],
          sessionData: [
            {
              sessionNumber: 1,
              stepId: 'avoidance-check',
              stepTitle: 'What do you do when pain shows up?',
              inputValue: ['Avoid crowds'],
              timestamp: new Date(Date.now() - 86400000 * 3).toISOString()
            }
          ]
        },
        'THERAPIST': { 
          id: 't1', 
          name: 'Dr. Sarah Smith', 
          role: UserRole.THERAPIST, 
          email: 'sarah@clinic.com', 
          clinicId: 'clinic-1', 
          phoneNumber: '+1 (555) 098-7654', 
          hasConsented: true,
          consentTimestamp: new Date(Date.now() - 86400000 * 30).toISOString()
        },
        'ADMIN': { 
          id: 'a1', 
          name: 'James Wilson', 
          role: UserRole.ADMIN, 
          email: 'admin@clinic.com', 
          clinicId: 'clinic-1', 
          phoneNumber: '+1 (555) 000-1111', 
          hasConsented: true,
          consentTimestamp: new Date(Date.now() - 86400000 * 30).toISOString()
        },
        'SUPER_ADMIN': { 
          id: 'sa1', 
          name: 'System Admin', 
          role: UserRole.SUPER_ADMIN, 
          email: 'super@actsaas.com', 
          phoneNumber: '+1 (555) 999-9999', 
          hasConsented: true,
          consentTimestamp: new Date(Date.now() - 86400000 * 60).toISOString()
        }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialUsers));
    }
  }

  public getUsers(): Record<string, User> {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }

  public saveUser(key: string, user: User) {
    const users = this.getUsers();
    users[key] = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  public resetDatabase() {
    localStorage.removeItem(STORAGE_KEY);
    this.initializeDefaultData();
  }

  /**
   * Commits session progress to the user's history in the database.
   */
  public commitSessionResult(userId: string, result: SessionResult) {
    const users = this.getUsers();
    const entryKey = Object.keys(users).find(k => users[k].id === userId);
    if (entryKey) {
      const user = users[entryKey];
      const history = user.sessionHistory || [];
      const index = history.findIndex(h => h.sessionNumber === result.sessionNumber);
      
      if (index > -1) {
        history[index] = result;
      } else {
        history.push(result);
      }
      
      user.sessionHistory = history;
      user.currentSession = result.completed ? result.sessionNumber + 1 : result.sessionNumber;
      this.saveUser(entryKey, user);
    }
  }

  /**
   * Logs an atomic session interaction for forensic clinical tracking.
   */
  public addSessionData(userId: string, data: SessionData) {
    const users = this.getUsers();
    const entryKey = Object.keys(users).find(k => users[k].id === userId);
    if (entryKey) {
      const user = users[entryKey];
      if (!user.sessionData) user.sessionData = [];
      user.sessionData.push(data);
      this.saveUser(entryKey, user);
    }
  }
}

export const storageService = StorageService.getInstance();
