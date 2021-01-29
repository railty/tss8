<script>
	import { onMount,  } from 'svelte';
	import Clock from './Clock.svelte';
	import Admin from './Admin.svelte';
	import SwapText from './SwapText.svelte';

	let mode = 'clock';
	//let mode = 'admin';

	let message = "";
	let updates;
	async function init(){
		globalThis.config = await electronSvr.getConfig();
		
		electronSvr.setupListener((msg)=>{
			if (typeof msg == "string") {
				message = msg;
			}
			else if (typeof msg == "object") {
				if (msg.type=='update'){
					updates = msg.messages;
				}
			}
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
			<div class="px-4 border-l-2"><SwapText texts={updates}/></div>
			<div id="version" class="px-4 border-l-2">{globalThis.config ? globalThis.config.version : "waiting"}</div>
		</footer>
	{/await}
</div>
