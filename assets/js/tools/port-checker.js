document.addEventListener("DOMContentLoaded",()=>{

const hostInput=document.getElementById("host")
const portInput=document.getElementById("port")
const protocolSelect=document.getElementById("protocol")
const checkBtn=document.getElementById("checkBtn")

const resultsBody=document.getElementById("resultsBody")
const loader=document.getElementById("loader")

const targetLabel=document.getElementById("targetLabel")
const statusLabel=document.getElementById("statusLabel")
const latencyLabel=document.getElementById("latencyLabel")
const protocolLabel=document.getElementById("protocolLabel")

const statusBadge=document.getElementById("statusBadge")

function escapeHtml(str){
return String(str).replace(/[&<>"']/g,function(m){
return({
"&":"&amp;",
"<":"&lt;",
">":"&gt;",
'"':"&quot;",
"'":"&#39;"
})[m]
})
}

function setLoader(v){
loader.hidden=!v
}

function setStatus(v){
statusBadge.textContent=v
}

function probe(host,port,protocol,timeout){

return new Promise((resolve)=>{

let img=new Image()
let start=performance.now()
let finished=false

function done(ok,message){

if(finished)return
finished=true

clearTimeout(timer)

let latency=Math.round(performance.now()-start)

resolve({
ok,
latency,
message
})

}

let timer=setTimeout(()=>{
done(false,"Timed out")
},timeout)

img.onload=()=>done(true,"Server responded")
img.onerror=()=>done(true,"Host reachable")

img.src=`${protocol}://${host}:${port}/favicon.ico?cache=${Date.now()}`

})

}

async function runCheck(){

let host=hostInput.value.trim()
let port=portInput.value.trim()
let protocol=protocolSelect.value

if(!host){

resultsBody.innerHTML=`<tr><td colspan="4">Enter host</td></tr>`
return

}

if(!port){

port=(protocol==="https")?"443":"80"
portInput.value=port

}

setLoader(true)
setStatus("Checking")

targetLabel.textContent=`${host}:${port}`
protocolLabel.textContent=protocol.toUpperCase()

let result=await probe(host,port,protocol,5000)

setLoader(false)

let status=result.ok?"Reachable":"Unreachable"

targetLabel.textContent=`${host}:${port}`
statusLabel.textContent=status
latencyLabel.textContent=result.latency+" ms"

setStatus(status)

resultsBody.innerHTML=`

<tr>
<td class="mono">${escapeHtml(host+":"+port)}</td>
<td>${escapeHtml(status)}</td>
<td>${escapeHtml(result.latency+" ms")}</td>
<td>${escapeHtml(protocol.toUpperCase())}</td>
</tr>

<tr>
<td colspan="4" class="mono muted">
${escapeHtml(result.message)}
</td>
</tr>

`

}

checkBtn.addEventListener("click",runCheck)

hostInput.addEventListener("keydown",(e)=>{
if(e.key==="Enter")runCheck()
})

portInput.addEventListener("keydown",(e)=>{
if(e.key==="Enter")runCheck()
})

})
