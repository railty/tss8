<script>
import semver from "semver";
import { onMount } from 'svelte';
import { getEmployees } from "./fb.js";


let localEmployees;
let remoteEmployees;

onMount(async () => {

});

async function dlEmployees(){
    localEmployees = await electronSvr.getLocalEmployees();

    let le = localEmployees.reduce((last, cur)=>{
        if (last[cur.id]){
            console.log("duplicated id, shouldn't happen");
        }
        else{
            last[cur.id] = cur;
        }
        return last;
    }, {});

    remoteEmployees = await getEmployees();

    for (let e of remoteEmployees){
        if (le[e.id]){
            //existing, do nothing
            if (e.updated_at > le[e.id].updated_at) 
            {
                e.status = "reconcile";
            }
            else e.status = "existing";
        }
        else{
            e.status = "reconcile";
        }
    }    

    for (let e of remoteEmployees){
        e.photoStatus = "updated";
        if (le[e.id]){
            if (le[e.id].photo_md5) 
            {
                if (le[e.id].photo_md5 != e.photo_md5) e.photoStatus = "reconcile";
            }
            else e.photoStatus = "reconcile";
        }
        else{
            e.photoStatus = "reconcile";
        }
    }    
}
async function dl(url) {
    return new Promise((resolve)=>{
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'blob';
        xhr.onload = (event) => {
            resolve(xhr.response);
        };
        xhr.open('GET', url);
        xhr.send();
    });
}

async function blobToDataURL(blob) {
    return new Promise((resolve)=>{
        var a = new FileReader();
        a.onload = function(e) {resolve(e.target.result);}
        a.readAsDataURL(blob);
    });
}

async function dlPhoto(){
    let employees = remoteEmployees.filter((e)=>e.photoStatus=="reconcile");
    
    //employees = employees.slice(0, 10);
    console.log(employees);
    for (let e of employees){
        let blob = await dl(e.photo_url);
        let dataUrl = await blobToDataURL(blob);
        await electronSvr.savePhoto(e.id, dataUrl);

        e.photoStatus = "updated"
        remoteEmployees = remoteEmployees;
    }
    await dlEmployees();
}

async function reconcile(){
    let employees = remoteEmployees.filter((e)=>e.status=="reconcile");
    console.log(employees);
    for (let e of employees){
        await electronSvr.upsertLocalEmployee(e);
    }
    await dlEmployees();
}

function assetPlatform(fileName){
  if (/.*(mac|darwin|osx).*(-arm).*\.zip/i.test(fileName)) {
    return PLATFORM_ARCH.DARWIN_ARM64
  }

  if (/.*(mac|darwin|osx).*\.zip/i.test(fileName) && !/arm64/.test(fileName)) {
    return PLATFORM_ARCH.DARWIN_X64
  }

  if (/win32-ia32/.test(fileName)) return PLATFORM_ARCH.WIN_IA32
  if (/win32-arm64/.test(fileName)) return PLATFORM_ARCH.WIN_ARM64
  if (/win32-x64|(\.exe$)/.test(fileName)) return PLATFORM_ARCH.WIN_X64
  return false
}

const PLATFORM_ARCH = {
  DARWIN_X64: 'darwin-x64',
  DARWIN_ARM64: 'darwin-arm64',
  WIN_X64: 'win32-x64',
  WIN_IA32: 'win32-ia32',
  WIN_ARM64: 'win32-arm64'
}
const PLATFORM_ARCHS = Object.values(PLATFORM_ARCH);

function hasAllAssets(latest){
  return !!(
    latest[PLATFORM_ARCH.DARWIN_X64] &&
    latest[PLATFORM_ARCH.DARWIN_ARM64] &&
    latest[PLATFORM_ARCH.WIN_X64] &&
    latest[PLATFORM_ARCH.WIN_IA32] &&
    latest[PLATFORM_ARCH.WIN_ARM64]
  )
}

function hasAnyAsset(latest){
  return !!(
    latest[PLATFORM_ARCH.DARWIN_X64] ||
    latest[PLATFORM_ARCH.DARWIN_ARM64] ||
    latest[PLATFORM_ARCH.WIN_X64] ||
    latest[PLATFORM_ARCH.WIN_IA32] ||
    latest[PLATFORM_ARCH.WIN_ARM64]
  )
}

async function update(){
    let account = 'railty';
    let repository = 'tss8';
    const url = `https://api.github.com/repos/${account}/${repository}/releases?per_page=100`;

    const headers = { Accept: 'application/vnd.github.preview' };
    //if (this.token) headers.Authorization = `token ${this.token}`;
    const res = await fetch(url, { headers });

    if (res.status === 403) {
      console.error('Rate Limited!')
      return
    }

    if (res.status >= 400) {
      return
    }

    let latest = {}

    const releases = await res.json()
    for (const release of releases) {
      if (!semver.valid(release.tag_name) || release.draft ) continue;

      for (const asset of release.assets) {
        const platform = assetPlatform(asset.name)
        if (platform && !latest[platform]) {
          latest[platform] = {
            name: release.name,
            version: release.tag_name,
            url: asset.browser_download_url,
            notes: release.body
          }
        }
        if (hasAllAssets(latest)) {
          break
        }
      }
    }

    for (const key of [PLATFORM_ARCH.WIN_X64, PLATFORM_ARCH.WIN_IA32, PLATFORM_ARCH.WIN_ARM64]) {
      if (latest[key]) {
        const rurl = `https://github.com/${account}/${repository}/releases/download/${latest[key].version}/RELEASES`
        const rres = await fetch(rurl)
        if (rres.status < 400) {
          const body = await rres.text()
          const matches = body.match(/[^ ]*\.nupkg/gim)
          const nuPKG = rurl.replace('RELEASES', matches[0])
          latest[key].RELEASES = body.replace(matches[0], nuPKG)
        }
      }
    }

    latest = hasAnyAsset(latest) ? latest : null;
    console.log(latest.RELEASES);
}

</script>
<div class="flex flex-row">
    <button class="m-4" on:click={dlEmployees}>Download Employees</button>
    <button class="m-4" on:click={reconcile}>Reconcile </button>
    <button class="m-4" on:click={dlPhoto}>Dl Photo</button>
    <button class="m-4" on:click={update}>Update</button>
</div>

{#if remoteEmployees}
    <table class="border-collapse border-2">
        <tr>
            <th class="border border-green-200">ID</th>
            <th class="border border-green-200">Name</th>
            <th class="border border-green-200">Name_cn</th>
            <th class="border border-green-200">Store ID</th>
            <th class="border border-green-200">Updated_at</th>
            <th class="border border-green-200">Status</th>
            <th class="border border-green-200">Photo Status</th>
        </tr>

        {#each remoteEmployees as e}
            <tr>
                <td class="border border-green-200">{e.id}</td>
                <td class="border border-green-200">{e.name}</td>
                <td class="border border-green-200">{e.name_cn}</td>
                <td class="border border-green-200">{e.store_id}</td>
                <td class="border border-green-200">{e.updated_at}</td>
                <td class={e.status=="reconcile" ? "bg-red-300" : "" + "border border-green-200"}>{e.status}</td>
                <td class={e.photoStatus=="reconcile" ? "bg-red-300" : "" + "border border-green-200"}>{e.photoStatus}</td>
            </tr>
        {/each}
    </table>
{/if}
