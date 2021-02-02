<script>
	import { onMount } from 'svelte';

	export let mode = 'admin';
	export let menu = 'setting';

	function logout(){
		mode = 'clock';
	}

	let popup = false;
	let activeMenuClass = "bg-gray-900 text-white px-3 py-2 rounded-md font-medium";
	let menuClass = "text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md font-medium";
	let menus = [
		{
			menu: 'setting',
			label: 'Setting'
		},
		{
			menu: 'punchData',
			label: 'Punch'
		},
		{
			menu: 'employeeData',
			label: 'Employee'
		},
		{
			menu: 'mysqlEmployeeData',
			label: 'mysql Employee'
		},
	];

</script>

<nav class="bg-gray-800">
	<div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
	  <div class="relative flex items-center justify-between h-16">
		<div class="absolute inset-y-0 left-0 flex items-center sm:hidden">
		  <!-- Mobile menu button-->
		  <button on:click={()=>{popup = !popup;}} class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" aria-expanded="false">
			<span class="sr-only">Open main menu</span>
			<!-- Icon when menu is closed. -->
			<!--
			  Heroicon name: menu
			  Menu open: "hidden", Menu closed: "block"
			-->
			<svg aria-label="hamburger" class={popup ? 'hidden h-6 w-6' : 'block h-6 w-6'} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
			  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
			<!-- Icon when menu is open. -->
			<!--
			  Heroicon name: x
  
			  Menu open: "block", Menu closed: "hidden"
			-->
			<svg aria-label="close" class={popup ? 'block h-6 w-6' : 'hidden h-6 w-6'} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
			  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		  </button>
		</div>
		<div class="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
		  <div class="flex-shrink-0 flex items-center">
			<svg aria-label="clock" class="w-10 h-10" fill="none" stroke="green" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
		  </div>
		  <div class="hidden sm:block sm:ml-6">
			<div class="flex space-x-4">
			  {#each menus as m}
			  	<a href="##" on:click={ ()=>{ menu = m.menu } } class={(menu=='{m.menu}' ? activeMenuClass : menuClass) + "text-sm"}>{m.label}</a>
			  {/each}
			</div>
		  </div>
		</div>

		<div class="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
		  <button id="exit" on:click={logout} class="bg-gray-800 p-1 rounded-full text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
			<span class="sr-only">Logout</span>
			<svg aria-label="exit" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
		  </button>
		</div>
	  </div>
	</div>
  
	<!--
	  Mobile menu, toggle classes based on menu state.
  
	  Menu open: "block", Menu closed: "hidden"
	-->
	<div class={popup ? 'block' : "hidden sm:hidden"} >
	  <div class="px-2 pt-2 pb-3 space-y-1">
		{#each menus as m}
			<a href="##" on:click={ ()=>{ menu = m.menu } } class={(menu=='{m.menu}' ? activeMenuClass : menuClass) + "block text-base"}>{m.label}</a>
		{/each}
	  </div>
	</div>
</nav>
