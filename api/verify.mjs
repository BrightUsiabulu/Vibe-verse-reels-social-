import {json,notReady,paymentsEnabled,account,supa,ref,confirmReference} from '../lib/vv-backend.mjs';
export async function GET(request){
 if(!paymentsEnabled())return notReady('payment-verification');
 const user=await account(request).catch(()=>null);if(!user)return json({ok:false,code:'SIGN_IN_REQUIRED'},401);
 const reference=new URL(request.url).searchParams.get('reference');
 if(!ref(reference))return json({ok:false,code:'INVALID_REFERENCE'},400);
 try{
 const rows=await supa('vv_payment_orders?select=buyer_id,merchant_id,status,amount_kobo&provider_ref=eq.'+encodeURIComponent(reference)+'&limit=1');
 const order=rows?.[0];if(!order||!(order.buyer_id===user.id||order.merchant_id===user.id))return json({ok:false,code:'NOT_AUTHORIZED'},403);
 const result=await confirmReference(reference);
 return json({ok:true,verified:true,reference,status:'paid',amount_kobo:order.amount_kobo,mode:process.env.PAYSTACK_SECRET_KEY.startsWith('sk_live_')?'live':'test'});
 }catch(e){return json({ok:false,verified:false,code:'UNVERIFIED_PAYMENT',message:'Provider verification did not confirm the payment.'},422)}
}
