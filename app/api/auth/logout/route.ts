import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/firebase";
import { signOut } from "firebase/auth";

export async function POST() {
    try {
        await signOut(auth);
        return NextResponse.json({ status: true });
    } catch (error: any) {
        return NextResponse.json({ status: false, error: error.message }, { status: 400 });
    }
}
