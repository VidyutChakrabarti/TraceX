import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Case from '@/models/Case';

export async function GET() {
    await dbConnect();
    const cases = await Case.find({});
    return NextResponse.json({ status: true, cases });
}

export async function POST(req) {
    await dbConnect();
    const data = await req.json();
    const newCase = await Case.create(data);
    return NextResponse.json({ status: true, case: newCase });
}
