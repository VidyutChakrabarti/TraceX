import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';

export async function POST(req) {
    await dbConnect();
    const { email } = await req.json();
    if (!email) return NextResponse.json({ status: false, error: 'Email required' }, { status: 400 });
    let user = await User.findOne({ email });
    if (!user) user = await User.create({ email });
    return NextResponse.json({ status: true, user });
}

export async function GET(req) {
    await dbConnect();
    const users = await User.find({});
    return NextResponse.json({ status: true, users });
}
