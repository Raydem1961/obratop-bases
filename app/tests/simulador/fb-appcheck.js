export class ReCaptchaV3Provider{constructor(k){this.key=k}}
export const initializeAppCheck=(app,o)=>{window.__appcheck={key:o.provider.key,auto:o.isTokenAutoRefreshEnabled}};
