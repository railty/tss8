<script>
	import { onMount, setContext } from 'svelte';
	import Clock from './Clock.svelte';
	import Admin from './Admin.svelte';

	let mode = 'clock';
	//let mode = 'admin';

	let message = "";
	async function init(){
		globalThis.config = await electronSvr.getConfig();
		
		electronSvr.setupListener((msg)=>{
			message = msg;
		});
	}
	async function initDebug(){
		return new Promise((resolve)=>{
			setTimeout(()=>{
				resolve();
			}, 1*1000);
		});
	}

	let loading;		
	onMount(async () => {
		loading = init();		
	});

</script>


<div class="flex flex-col h-screen">
	{#await loading}		
		<div class="m-auto">
			<h1 class="text-6xl text-red-200">Loading ...</h1>
		</div>
	{:then}
		<main class="flex flex-grow">
			{#if mode=='admin'}
				<Admin bind:mode={mode}/>
			{/if}
			{#if mode=='clock'}
				<Clock bind:mode={mode}/>
			{/if}
		</main>
			
		<footer class="flex flex-row justify-end items-center pt-2">
			<div class="px-4 border-l-2 flex-grow">{message}</div>
			<div class="px-4 border-l-2" id='status'></div>
			<div class="px-4 border-l-2" id="db"></div>
			<div class="px-4 border-l-2" id="ips"></div>
			<div class="px-4 border-l-2" id="version">{globalThis.config ? globalThis.config.version : "waiting"}</div>
		</footer>
	{/await}
</div>
