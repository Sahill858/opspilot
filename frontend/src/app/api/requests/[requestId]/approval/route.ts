
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
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

    const { requestId } = await params;
    const body = await request.json();

    const backendResponse = await fetch(
      `${apiUrl}/requests/${requestId}/approval`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const responseText = await backendResponse.text();

    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = {
        detail: `Backend returned non-JSON response. HTTP ${backendResponse.status}`,
      };
    }

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error("Approval POST error:", error);

    return NextResponse.json(
      { detail: "Unable to submit approval" },
      { status: 500 }
    );
  }
}
