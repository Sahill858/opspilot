
import { NextRequest, NextResponse } from "next/server";

async function readBackendResponse(response: Response) {
  const responseText = await response.text();

  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch {
    const preview = responseText
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);

    return {
      detail: `Backend returned a non-JSON response. HTTP ${response.status}. ${preview}`,
    };
  }
}

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

    const data = await readBackendResponse(backendResponse);

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error("Approval POST error:", error);

    return NextResponse.json(
      { detail: "Unable to submit approval. Check the server logs." },
      { status: 500 }
    );
  }
}

export async function GET(
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

    const backendResponse = await fetch(
      `${apiUrl}/requests/${requestId}/approvals`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    const data = await readBackendResponse(backendResponse);

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error("Approval GET error:", error);

    return NextResponse.json(
      { detail: "Unable to fetch approval history. Check the server logs." },
      { status: 500 }
    );
  }
}
