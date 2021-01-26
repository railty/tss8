<script>
	import { onMount, setContext } from 'svelte';

	import Navbar from './Navbar.svelte';	
	import Main from './Main.svelte';
	import Setting from './Setting.svelte';	
	import PunchData from './PunchData.svelte';	
	import EmployeeData from './EmployeeData.svelte';	

	let mode = 'clock';
	//let mode = 'admin';

	let popup = false;
	let menu = 'employeeData';

	async function init(){
		globalThis.config = await electronSvr.getConfig();
	}

	let loading;		
	onMount(async () => {
		loading = init();		
	});

</script>

{#await loading}
	<div class="flex h-screen">
		<div class="m-auto">
			<h1 class="text-6xl text-red-200">Loading ...</h1>
		</div>
	</div>
{:then}
	{#if mode=='admin'}
		<Navbar bind:menu={menu} bind:mode={mode}/>

		{#if menu=='setting'}
			<Setting />
		{/if}

		{#if menu=='punchData'}
			<PunchData />
		{/if}

		{#if menu=='employeeData'}
			<EmployeeData />
		{/if}

	{:else}
		<Main bind:mode={mode}/>
	{/if}
{/await}

<style>
</style>

