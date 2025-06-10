import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export async function POST(req: NextRequest) {
    const { email, password } = await req.json();
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return NextResponse.json({ status: true, user: userCredential.user });
    } catch (error: any) {
        return NextResponse.json({ status: false, error: error.message }, { status: 400 });
    }
}
