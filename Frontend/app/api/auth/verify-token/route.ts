import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "No token found" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.TOKEN_SECRET!);

    return NextResponse.json({ success: true, decoded });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 });
  }
}
