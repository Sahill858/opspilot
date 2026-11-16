import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("opspilot_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const apiUrl = process.env.OPSPILOT_API_URL;

  if (!apiUrl) {
    throw new Error("Backend API URL is not configured");
  }

  try {
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      redirect("/login");
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    throw new Error("Unable to verify authentication with the backend");
  }
}