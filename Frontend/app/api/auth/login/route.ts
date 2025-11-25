import { connect } from "@/dbConfig/dbConfig";
import User from "@/models/userModel";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
    try {
        // Connect to database
        await connect();

        const reqBody = await request.json()
        const { email, password } = reqBody;

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            )
        }

        const user = await User.findOne({ email })
        if (!user) {
            return NextResponse.json(
                { error: "User does not exist" },
                { status: 400 }
            )
        }
        
        const validPassword = await bcrypt.compare(password, user.password)
        
        if (!validPassword) {
            return NextResponse.json(
                { error: "Invalid password" },
                { status: 400 }
            )
        }

        const tokenData = {
            id: user._id,
            email: user.email
        }
        const token = await jwt.sign(tokenData, process.env.TOKEN_SECRET!, { expiresIn: "1d" })

        const response = NextResponse.json({
            message: "Login successful",
            success: true,
        })
        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        })
        return response;

    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: error.message || "Login failed. Please try again." },
            { status: 500 }
        )
    }
}