export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';

export interface EMRProfile {
  userId?: string;
  fullName: string;
  dateOfBirth: string;
  bloodGroup: BloodGroup;
  allergies: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  activeConditions: string;
  updatedAt?: string;
}
