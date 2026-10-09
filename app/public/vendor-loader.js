// Reserva: se a cópia local do SheetJS não existir, carrega a versão oficial fixada (0.20.3) do CDN do fabricante.
// A política de segurança (CSP) do app permite apenas esse endereço exato.
(function(){
  if(window.XLSX)return;
  var s=document.createElement('script');
  s.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  s.async=false;
  document.head.appendChild(s);
})();
