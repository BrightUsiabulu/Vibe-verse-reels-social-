import {admin,configured,reply,error,generateState,oauthCookie,authUrl} from '../../lib/adsense.mjs';
export async function POST(request){
  if(!configured())return error(503,'AdSense server configuration is incomplete');
  if(request.headers.get('origin')!==new URL(request.url).origin)return error(403,'Invalid origin');
  try{
    if(!(await admin(request)))return error(403,'Verified VibeVerse administrator required');
    const state=generateState();
    return reply({authorizationUrl:authUrl(state)},200,{'set-cookie':oauthCookie(state)});
  }catch{return error(503,'Google AdSense connection not ready')}
}