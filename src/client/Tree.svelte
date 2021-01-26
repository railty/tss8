<script context="module">
	// retain module scoped expansion state for each tree node
	const _expansionState = {
		/* treeNodeId: expanded <boolean> */
	}
</script>
<script>
	import { slide } from 'svelte/transition'
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let tree
	const {id, label, type, value, children} = tree

	let expanded = _expansionState[id] || false
	const toggleExpansion = () => {
		expanded = _expansionState[id] = !expanded
    }

    export let selected = false;
	const itemClicked = (id) => {
        selected = true;
	}
    
    let input;
    function update(){
        console.log(type);
        let v = input.value;
        if (type=="number") v = Number(v);
        if (type=="boolean") v = v.toLowerCase().trim()=="true";

		dispatch('message', {
            id: id,
            value: v
		});
    }
	$: arrowDown = expanded
</script>

<ul transition:slide>
	<li>
		{#if children}
            <span on:click={toggleExpansion} class="arrow" class:arrowDown>&#x25b6</span>
            <span on:click={()=>{itemClicked(id)}} class="{selected ? 'bg-red-200' : 'bg-white-200'}">{label}</span>
			{#if expanded}
				{#each children as child}
					<svelte:self tree={child} on:message/>
				{/each}
			{/if}
        {:else}
            <span class="flex">
                <span class="no-arrow"/>
                <span on:click={()=>{itemClicked(id)}} class="{selected ? 'bg-red-200' : 'bg-white-200'}">{label}</span>
                <span class="flex-grow"></span>
                <input class="" bind:this={input} value={value}>
                <button on:click={update}>Update</button>
            </span>
		{/if}
	</li>
</ul>

<style>
	ul {
		margin: 0;
		list-style: none;
		padding-left: 1.2rem; 
        user-select: none;
	}
	.no-arrow { padding-left: 1.0rem; }
	.arrow {
		cursor: pointer;
		display: inline-block;
		transition: transform 200ms;
	}
	.arrowDown { transform: rotate(90deg); }
</style>
