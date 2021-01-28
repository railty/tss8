<script>
    import { onMount, onDestroy } from 'svelte';
    
    export let texts = ['', '']

    let first = true;
    onMount(async () => {
		interval = setInterval(()=>{
            first = !first;
        }, 1000);
    });
    
    let interval = 0;
    onDestroy(async () => {
        if (interval != 0) {
			clearInterval(interval);
        	interval = 0;
		}
	});

</script>
<span class="bg-yellow-300">
    {#if first}
        {texts[0]}
    {:else}
        {texts[1]}
    {/if}
</span>
