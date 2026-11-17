import {reply,error} from '../lib/adsense.mjs';
export function GET(){
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
  if(!url||!key)return error(503,'Publisher login configuration is incomplete');
  if(key.startsWith('sb_secret_')||key.includes('service_role'))return error(503,'A public Supabase key is required');
  try{if(key.split('.').length===3&&JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString('utf8')).role==='service_role')return error(503,'A public Supabase key is required')}catch{}
  return reply({supabaseUrl:url,supabaseAnonKey:key});
}