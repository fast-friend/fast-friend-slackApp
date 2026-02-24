export interface OnboardingPreFillData {
    name: string;
    email: string;
    avatarUrl: string | null;
    departments: string[];
    roles: string[];
    hobbies: string[];
    birthdate: string | null;
    photoUrl: string | null;
    onboardingCompleted: boolean;
    availableRoles: string[];
    availableDepartments: string[];
}

export interface OnboardingFormValues {
    name: string;
    email: string;
    photoUrl: string | null;
    departments: string[];
    roles: string[];
    hobbies: string[];
    birthdate: string; // ISO date string
}

export type PhotoUploadState = "idle" | "uploading" | "done" | "error";
