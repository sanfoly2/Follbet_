import { createContext, useContext } from 'react';
import { User as FirebaseUser } from 'firebase/auth';

export interface UserData {
  userId: string;
  email: string;
  balance: number;
  bonusBalance?: number;
  bonusRolloverTarget?: number;
  bonusRolloverProgress?: number;
  referralBalance?: number;
  referredBy?: string;
  vipLevel: number;
  lastIp: string;
  referralCode?: string;
  referralCount?: number;
  migrationBonusApplied_v1?: boolean;
  previewBonusV1?: boolean;
}

export interface AuthContextType {
  user: UserData | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
