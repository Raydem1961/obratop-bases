export const getStorage=()=>({});
export const ref=(s,p)=>({path:p});
export const uploadBytes=async(r)=>({ref:r});
export const getDownloadURL=async(r)=>'https://files.test/'+encodeURIComponent(r.path);
export const deleteObject=async()=>{};
