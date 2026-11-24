
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("opspilot_token")?.value;

    if (!token) {
      return NextResponse.json(
        { detail: "Unauthorized" },
        { status: 401 }
      );
    }

    const unreadOnly = request.nextUrl.searchParams.get("unread");

    const endpoint =
      unreadOnly === "count"
        ? "/notifications/unread-count"
        : "/notifications/";

    const apiUrl = process.env.OPSPILOT_API_URL;

    if (!apiUrl) {
      throw new Error("OPSPILOT_API_URL is not configured");
    }

    const response = await fetch(`${apiUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const responseText = await response.text();

    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
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
    console.error("Notifications API error:", error);

    return NextResponse.json(
      { detail: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
