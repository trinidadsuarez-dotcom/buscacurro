/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'candidate' | 'recruiter';
  isVerified: boolean;
  verifiedAt?: string;
  location: string;
  industry: string;
  cvText?: string;
  cvName?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  type: 'local' | 'remote';
  salaryMin: number;
  salaryMax: number;
  industry: string;
  recruiterId: string;
  postedAt: string;
  isVerifiedCompany: boolean;
}

export type ApplicationStatus = 'Applied' | 'Screening' | 'Interview' | 'Offered' | 'Rejected';

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  appliedAt: string;
  resumeTailored?: string;
  coverLetterTailored?: string;
  // Included populated fields for client ease
  jobTitle?: string;
  companyName?: string;
  candidateName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'success' | 'alert' | 'email_simulated';
  read: boolean;
  createdAt: string;
  emailSentTo?: string; // If an email was also sent, it lists the address here
}
