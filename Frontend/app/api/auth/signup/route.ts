import { connect } from "@/dbConfig/dbConfig";
import User from "@/models/userModel";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
    try {
        // Connect to database
        await connect();

        const reqBody = await request.json()
        const { username, email, password } = reqBody

        // Validate input
        if (!username || !email || !password) {
            return NextResponse.json(
                { error: "Username, email, and password are required" },
                { status: 400 }
            )
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email })

        if (existingUser) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 400 }
            )
        }

        // Hash password using bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        })

        const savedUser = await newUser.save()

        return NextResponse.json({
            message: "User created successfully",
            success: true,
            savedUser
        })
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: error.message || "Signup failed. Please try again." },
            { status: 500 }
        )
    }
}