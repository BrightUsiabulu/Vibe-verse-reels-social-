import {admin,configured,reply,error,readRefreshToken,tokenRequest,googleGet} from '../lib/adsense.mjs';
const ranges={today:'TODAY',yesterday:'YESTERDAY',last7:'LAST_7_DAYS',month:'MONTH_TO_DATE'};
export async function GET(request){
  if(!configured())return error(503,'AdSense server configuration is incomplete');
  try{
    if(!(await admin(request)))return error(403,'Verified VibeVerse administrator required');
    const period=new URL(request.url).searchParams.get('period')||'month';
    if(!Object.hasOwn(ranges,period))return error(400,'Invalid period');
    const refresh=await readRefreshToken();
    if(!refresh)return error(409,'AdSense account authorization is required');
    const tokens=await tokenRequest({grant_type:'refresh_token',refresh_token:refresh});
    const accounts=await googleGet('https://adsense.googleapis.com/v2/accounts',tokens.access_token);
    const name=process.env.ADSENSE_ACCOUNT_NAME||'accounts/pub-3767027718493089';
    if(!/^accounts\/pub-\d{16}$/.test(name))return error(503,'Invalid expected AdSense account');
    if(!(accounts.accounts||[]).some(x=>x.name===name))return error(403,'The authorized account does not have access to the expected AdSense publisher');
    const url=new URL('https://adsense.googleapis.com/v2/'+name+'/reports:generate');
    url.searchParams.set('dateRange',ranges[period]);
    ['ESTIMATED_EARNINGS','IMPRESSIONS','CLICKS'].forEach(metric=>url.searchParams.append('metrics',metric));
    const report=await googleGet(url,tokens.access_token);
    const headers=report.headers||[],totals=report.totals?.cells||[];
    const value=n=>{const index=headers.findIndex(h=>h.name===n);return index<0?null:Number(totals[index]?.value||0)};
    return reply({source:'Google AdSense Management API v2',period,account:name,estimated:true,currency:headers.find(h=>h.name==='ESTIMATED_EARNINGS')?.currencyCode||null,estimatedEarnings:value('ESTIMATED_EARNINGS'),impressions:value('IMPRESSIONS'),clicks:value('CLICKS'),warnings:report.warnings||[],retrievedAt:new Date().toISOString()});
  }catch{return error(502,'Unable to retrieve verified AdSense reporting data')}
}