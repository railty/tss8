<script>
import { onMount } from 'svelte';
import { savePunch, getPunches } from "./fb.js";

let localPunches;
let remotePunches;

onMount(async () => {
    await loadPunches();
});

async function loadPunches(){
    await getLocalPunches();
    await getRemotePunches();

    let rh = remotePunches.reduce((last, cur)=>{
        if (last[cur.id]){
            console.log("duplicated id, shouldn't happen");
        }
        else{
            last[cur.id] = cur;
        }
        return last;
    }, {});

    console.log(rh);

    for (let l of localPunches){
        if (rh[l.id]){
            //existing, do nothing
            l.status = "existing";
        }
        else{
            l.status = "reconcile";
        }
    }

    localPunches = localPunches;
    console.log(localPunches);
}

async function getLocalPunches(){
    localPunches = await electronSvr.getLocalPunches();
    console.log(localPunches);
}
async function getRemotePunches(){
    remotePunches = await getPunches();
    console.log(remotePunches);
}

async function reconcile(){
    let punches = localPunches.filter((p)=>p.status=="reconcile");
    console.log(punches);
    for (let p of punches){
        await savePunch(p);
    }

    await loadPunches();
}

</script>
<button on:click={reconcile}>Reconcile Punch</button>
{#if localPunches}
    <table class="border-collapse border-2">
        <tr>
            <th class="border border-green-200">ID</th>
            <th class="border border-green-200">Time</th>
            <th class="border border-green-200">Action</th>
            <th class="border border-green-200">Employee ID</th>
            <th class="border border-green-200">Photo</th>
            <th class="border border-green-200">Status</th>
        </tr>

        {#each localPunches as p}
            <tr>
                <td class="border border-green-200">{p.id}</td>
                <td class="border border-green-200">{p.time}</td>
                <td class="border border-green-200">{p.action}</td>
                <td class="border border-green-200">{p.employee_id}</td>
                <td class="border border-green-200">
                    <img class="w-24" src={p.photo} alt="alt" />
                </td>
                <td class={p.status=="reconcile" ? "bg-red-300" : "" + "border border-green-200"}>{p.status}</td>
            </tr>
        {/each}
    </table>
{/if}
