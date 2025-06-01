import dbConnect from '@/utils/dbConnect';
import CustodyRoute from '@/models/CustodyRoute';

export async function GET(req, { params }) {
  await dbConnect();
  try {
    const { transactionId } = params;
    if (!transactionId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing transactionId.' }), { status: 400 });
    }
    const doc = await CustodyRoute.findOne({ transactionId });
    if (!doc) {
      return new Response(JSON.stringify({ success: false, error: 'Not found.' }), { status: 404 });
    }
    return new Response(JSON.stringify({ success: true, data: doc }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
