
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email and password are required" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.OPSPILOT_API_URL;

    if (!apiUrl) {
      return NextResponse.json(
        { detail: "Backend API URL is not configured" },
        { status: 500 }
      );
    }

    // FastAPI OAuth2PasswordRequestForm expects form data.
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const backendResponse = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      cache: "no-store",
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { detail: data.detail || "Invalid email or password" },
        { status: backendResponse.status }
      );
    }

    const response = NextResponse.json({
      message: "Login successful",
    });

    response.cookies.set("opspilot_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      { detail: "Unable to connect to authentication service" },
      { status: 500 }
    );
  }
}
