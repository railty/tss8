<script>
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

</script>
<div class="flex flex-row">
    <button class="m-4" on:click={dlEmployees}>Download Employees</button>
    <button class="m-4" on:click={reconcile}>Reconcile </button>
    <button class="m-4" on:click={dlPhoto}>Dl Photo</button>
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
