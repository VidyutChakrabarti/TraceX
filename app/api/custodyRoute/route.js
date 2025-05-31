import dbConnect from '@/utils/dbConnect';
import CustodyRoute from '@/models/CustodyRoute';

export async function POST(req) {
  await dbConnect();
  try {
    const body = await req.json();
    const { transactionId, evidenceId, from, to, route } = body;
    if (!transactionId || !evidenceId || !from || !to || !route) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields.' }), { status: 400 });
    }
    const doc = await CustodyRoute.create({ transactionId, evidenceId, from, to, route });
    return new Response(JSON.stringify({ success: true, data: doc }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}

export async function GET(req) {
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const evidenceId = searchParams.get('evidenceId');
    if (!evidenceId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing evidenceId.' }), { status: 400 });
    }
    const docs = await CustodyRoute.find({ evidenceId });
    return new Response(JSON.stringify({ success: true, data: docs }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
