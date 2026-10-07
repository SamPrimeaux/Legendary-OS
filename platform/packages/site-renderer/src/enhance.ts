/** Tiny progressive-enhancement script. Inlined for the draft; move to an external asset for strict CSP. */
export const ENHANCE_JS = `
(function(){
 var $=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
 $('[data-ba]').forEach(function(el){var r=el.querySelector('input[type=range]');if(!r)return;var u=function(){el.style.setProperty('--pos',r.value+'%');};r.addEventListener('input',u);u();});
 $('[data-open-overlay]').forEach(function(b){b.addEventListener('click',function(){var d=document.getElementById('ov-'+b.getAttribute('data-open-overlay'));if(d&&d.showModal)d.showModal();});});
 $('dialog.s-overlay').forEach(function(d){
  d.addEventListener('click',function(e){if(e.target===d)d.close();});
  $('[data-close]',d).forEach(function(c){c.addEventListener('click',function(){d.close();});});
  if(d.getAttribute('data-trigger')==='delay'){
   try{if(sessionStorage.getItem(d.id))return;}catch(e){}
   setTimeout(function(){if(d.showModal){d.showModal();try{sessionStorage.setItem(d.id,'1');}catch(e){}}},+d.getAttribute('data-delay')||8000);
  }
 });
 $('[data-nav-toggle]').forEach(function(b){b.addEventListener('click',function(){document.body.classList.toggle('nav-open');});});
 $('form[data-lead-form]').forEach(function(f){f.addEventListener('submit',function(e){
  e.preventDefault();var s=f.querySelector('[data-form-status]');var o={};
  new FormData(f).forEach(function(v,k){o[k]=v;});
  fetch('/api/leads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(o)})
   .then(function(r){return r.json();})
   .then(function(j){if(s)s.textContent=j&&j.ok?'Thanks, we will be in touch shortly.':'Something went wrong. Please call us instead.';if(j&&j.ok)f.reset();})
   .catch(function(){if(s)s.textContent='Preview only: this form posts to the live worker.';});
 });});
})();
`;
