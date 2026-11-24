
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("opspilot_token")?.value;

    if (!token) {
      return NextResponse.json(
        { detail: "Unauthorized" },
        { status: 401 }
      );
    }

    const apiUrl = process.env.OPSPILOT_API_URL;

    if (!apiUrl) {
      throw new Error("OPSPILOT_API_URL is not configured");
    }

    const response = await fetch(`${apiUrl}/activity-logs/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const responseText = await response.text();

    let data;

    try {
      data = responseText ? JSON.parse(responseText) : [];
    } catch {
      console.error(
        "Backend returned non-JSON response:",
        response.status,
        responseText
      );

      data = {
        detail: responseText || "Backend returned an empty response",
      };
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Activity Logs API error:", error);

    return NextResponse.json(
      { detail: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
