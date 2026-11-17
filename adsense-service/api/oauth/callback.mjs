import {configured,validState,oauthCookie,tokenRequest,saveRefreshToken,html,SCOPE} from '../../lib/adsense.mjs';
export async function GET(request){
  const u=new URL(request.url), clear=oauthCookie('',0);
  if(!configured())return html('The server is not configured.',503,clear);
  if(!validState(request,u.searchParams.get('state')))return html('Invalid or expired authorization session. Start again from the administrator dashboard.',403,clear);
  if(u.searchParams.has('error'))return html('Google authorization was cancelled.',400,clear);
  if(!u.searchParams.get('code'))return html('Missing Google authorization code.',400,clear);
  try{
    const tokens=await tokenRequest({code:u.searchParams.get('code'),grant_type:'authorization_code',redirect_uri:process.env.GOOGLE_REDIRECT_URI});
    if(!tokens.refresh_token||!String(tokens.scope||'').split(' ').includes(SCOPE))return html('Google did not grant the required offline read-only access. Retry consent from the admin dashboard.',400,clear);
    await saveRefreshToken(tokens.refresh_token);
    return html('Google AdSense is connected. Return to the VibeVerse admin revenue page for reports.',200,clear);
  }catch{return html('Google authorization could not be saved. Check the private backend settings and database table.',502,clear)}
}