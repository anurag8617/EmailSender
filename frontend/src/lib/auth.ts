import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL, type ApiUser } from "./api";

export async function getCurrentUser(): Promise<ApiUser | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: ApiUser };
    return data.user;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<ApiUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}