<script>
import Tree from './Tree.svelte'
import { onMount } from 'svelte';

let config;
let tree;
onMount(async () => {
    config = await electronSvr.readConfig();
    //console.log(config);
    tree = toTree('Settings', 'settings', config);
    console.log(tree);
});

function toTree(label, id, obj){
    let tree = {
        label: label,
        id: id,
    };

    let children = [];
    for (let k of Object.keys(obj)){
        let v = obj[k];
        let child;
        let type = typeof v;
        if (type === 'object'){
            child = toTree(k, tree.id + '.' + k, v)
        }
        else child = {
            id: tree.id + '.' + k,
            label: k,
            value: v,
            type: type
        };

        children.push(child);
    }

    if (children.length>0) tree.children = children;

    return tree;
}

function onSave(e) {
    //console.log(config);

    let id = e.detail.id;
    let value = e.detail.value;

    let ids = id.split(".");
    let c = config;
    for (let i=1; i<ids.length-1; i++){
        c = c[ids[i]];
    }
    c[ids[ids.length-1]] = value;
    //console.log(config);
}

async function save(){
    config = await electronSvr.writeConfig(config);
    tree = toTree('Settings', 'settings', config);    
}

</script>

{#if tree}
    <button on:click={save} class="m-4 rounded-md bg-green-200">Save</button>
    <Tree {tree} on:message={onSave}/>
{/if}
