<svelte:head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js" />
</svelte:head>

<script>
import { onMount } from 'svelte';
import { getEmployees, uploadPhoto, updateEmployee } from "./fb.js";
import { callServer } from './clientUtils';

import Button from "./Button.svelte";

let employeesDb;
let employeesFb;
let files;

onMount(async () => {

});

//you may create dataUrl at the client js, however it may change slightly for unknow reasons, the photoUrl looks same but md5 will be different.
//could because the drawImage
//so do not use this, always generate the ataUrl at server side
async function doNotUse_imgToDataUrl(imgSrc){
    let dataUrl = await new Promise(resolve => {
      let canvas = document.createElement("canvas");
      let img = new Image();
      img.onload = function(){
        canvas.width = img.width;
        canvas.height = img.height;
        let context = canvas.getContext('2d');
        context.drawImage(img, 0, 0);
        let dataUrl = canvas.toDataURL("image/jpeg");
        resolve(dataUrl);
      }
      img.onerror = function(){
        console.error("load error:" + imgSrc);
        resolve(null);
      }
      img.src = imgSrc;
    });

    return dataUrl;
}

async function syncEmployee(empDb){
    let id = empDb.id;
    let empFb = employeesFb[id];    

    let photo_url;
    
    //have remote
    if (empFb){
      //photo not match
      if (empFb.photo_md5 != empDb.photo_md5) {
        console.warn("update photo:" + id);  
        let dataUrl = await callServer('GET', `/getDataUrl?type=employeePhoto&id=${id}`);
        photo_url = await uploadPhoto(id, dataUrl);
      }
      else{
        console.log("skip same photo:" + id);  
      }
    }
    else {
      console.warn("create new photo:" + id);  
      let rc = await callServer('GET', `/getDataUrl?type=employeePhoto&id=${id}`);
      photo_url = await uploadPhoto(id, rc.dataUrl);
    }

    let employeeRef = firebaseDb.collection("employees").doc(id.toString());

    //photo changed, update fb anyway
    if (photo_url) {
      empDb.photo_url = photo_url;
      console.warn("update " + id + " for new photo");
      await updateEmployee(employeeRef, empDb);
    }
    else{
      if (empFb){
        empDb.photo_url = empFb.photo_url;        
        if (empFb.updated_at.valueOf() < empDb.updated_at.valueOf()) {
          console.warn("update " + id + " for new updated_at");
          await updateEmployee(employeeRef, empDb);
        }
        else{
          console.log("skip fb data, same timestamp " + id);
        }
      }
      else{
        //shouldn't happen, no photo no data
        console.warn("create " + id);
        await updateEmployee(employeeRef, employee);
      }
    }
}

async function syncEmployees(){
    let docs = await getEmployees();

    employeesFb = {};
    docs.forEach((doc) => {
        employeesFb[doc.id] = doc;
    });

    employeesDb = await callServer('GET', '/getMysqlEmployees');
    for (let empDb of employeesDb){
      empDb.created_at = new Date(empDb.created_at);
      empDb.updated_at = new Date(empDb.updated_at);
      await syncEmployee(empDb);
    }

    console.log("completed!");
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

async function loadPhotos(){
  let rc = await electronSvr.loadPhotos();
  if (rc) await dlEmployees();
}

</script>
<div class="flex flex-row">
    <Button on:click={syncEmployees}>Mysql Employees</Button>
    <Button on:click={reconcile}>Reconcile</Button>
    <Button on:click={dlPhoto}>Download Photo</Button>
    <Button on:click={loadPhotos}>Load Photo</Button>
</div>

<!--
    flex-grow wuill set the height, but for some reason, you need h-1 to make the scroll bar work, or h-2, h-3, any thing
-->
<div class="bg-red-200 flex-grow overflow-y-auto h-1">
    {#if employeesDb}
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

        {#each employeesDb as e}
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
</div>
