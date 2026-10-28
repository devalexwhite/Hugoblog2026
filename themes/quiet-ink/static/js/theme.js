(() => {
 const system=window.matchMedia('(prefers-color-scheme: dark)');
 let saved;try{saved=localStorage.getItem('quiet-ink-theme')}catch{}
 function apply(theme){document.documentElement.dataset.theme=theme;const b=document.getElementById('theme-toggle');if(b){b.setAttribute('aria-label',`Switch to ${theme==='dark'?'light':'dark'} mode`);b.setAttribute('aria-pressed',String(theme==='dark'));}}
 apply(saved==='light'||saved==='dark'?saved:system.matches?'dark':'light');
 system.addEventListener('change',e=>{if(!saved)apply(e.matches?'dark':'light')});
 document.addEventListener('DOMContentLoaded',()=>{apply(document.documentElement.dataset.theme);document.getElementById('theme-toggle').addEventListener('click',()=>{saved=document.documentElement.dataset.theme==='dark'?'light':'dark';apply(saved);try{localStorage.setItem('quiet-ink-theme',saved)}catch{}})});
})();
