document.querySelector('#error').textContent=new URLSearchParams(location.search).get('message')||'正在准备本机后台。';
document.querySelector('#retry').onclick=async event=>{event.target.disabled=true;try{await window.xiaojiuDesktop.retry();}finally{event.target.disabled=false;}};
document.querySelector('#logs').onclick=()=>window.xiaojiuDesktop.logs();
document.querySelector('#quit').onclick=()=>window.xiaojiuDesktop.quit();

document.querySelector('#serverLogs').onclick=()=>window.xiaojiuDesktop.serverLogs();
