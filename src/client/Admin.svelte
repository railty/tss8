<script>
	import { onMount } from 'svelte';
	import Navbar from './Navbar.svelte';	
	import Setting from './Setting.svelte';	
	import PunchData from './PunchData.svelte';	
	import EmployeeData from './EmployeeData.svelte';	

	export let mode;
	let menu = 'employeeData';
</script>

<div class="flex flex-grow flex-col">
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
</div>
