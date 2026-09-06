export const backendEnabled: boolean;
export function getSession(): Promise<{ user?: { id: string; email?: string } } | null>;
export function signInGoogle(): Promise<void>;
export function signOut(): Promise<void>;
export function onAuthChange(
  cb: (session: { user?: { id: string; email?: string } } | null, event: string) => void,
): () => void;
export function refreshSessionIfNeeded(): Promise<{ user?: { id: string; email?: string } } | null>;
