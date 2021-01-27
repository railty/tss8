<script>
	import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    function onclick(e) {
        dispatch('click', e);
    }

</script>
<button class="h-10 px-5 m-2 text-blue-100 transition-colors duration-150 bg-blue-600 rounded-lg focus:shadow-outline hover:bg-blue-700" on:click={onclick}>
    <slot></slot>
</button>
