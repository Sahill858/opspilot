
import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{
    workflowId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
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

    const { workflowId } = await params;
    const body = await request.json();

    const backendResponse = await fetch(
      `${apiUrl}/workflows/${workflowId}/steps`,
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

    const data = await backendResponse.json();

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to create approval step" },
      { status: 500 }
    );
  }
}
