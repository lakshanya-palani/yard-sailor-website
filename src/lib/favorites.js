export async function readSavedIds(client,userId) {
  const ids=[];
  for(let offset=0;;offset+=1000){
    const {data,error}=await client.from('saved_products').select('product_id').eq('user_id',userId).order('product_id').range(offset,offset+999);
    if(error)throw new Error(error.code === 'PGRST205' || error.code === '42P01' ? 'Saved items are not set up yet. Please contact support.' : 'Saved items could not be loaded. Please retry.');
    ids.push(...data.map(row=>row.product_id));if(data.length<1000)return ids;
  }
}
export async function writeSaved(client,userId,productId,save) {
  if(!userId)throw new Error('Please log in to save items.');
  const result=save ? await client.from('saved_products').insert({user_id:userId,product_id:productId}) : await client.from('saved_products').delete().eq('user_id',userId).eq('product_id',productId);
  if(result.error && !(save && result.error.code==='23505'))throw new Error('Unable to update this saved item. It may no longer be available. Please retry.');
}
