
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("opspilot_token")?.value;

    if (!token) {
      return NextResponse.json(
        { detail: "Not authenticated" },
        { status: 401 }
      );
    }

    const apiUrl = process.env.OPSPILOT_API_URL;

    if (!apiUrl) {
      return NextResponse.json(
        { detail: "Backend API URL is not configured" },
        { status: 500 }
      );
    }

    const backendResponse = await fetch(
      `${apiUrl}/requests/pending-approvals`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    const responseText = await backendResponse.text();

    let data;

    try {
      data = responseText ? JSON.parse(responseText) : [];
    } catch {
      console.error(
        "Pending approvals returned non-JSON:",
        backendResponse.status,
        responseText.slice(0, 500)
      );

      data = {
        detail: `Backend returned non-JSON response. HTTP ${backendResponse.status}.`,
      };
    }

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error("Pending approvals GET error:", error);

    return NextResponse.json(
      { detail: "Unable to fetch pending approvals" },
      { status: 500 }
    );
  }
}
