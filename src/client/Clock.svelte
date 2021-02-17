<script>
	import { onMount, onDestroy } from 'svelte';
	import uuidv4 from 'uuid-v4';
	import SwapText from './SwapText.svelte';
	import { savePunch } from "./fb.js";

	export let mode;
	let cameraWidth = 240;
	let cameraHeight = 180;
	let video = null;
	let canvas = null;
	let context = null;
	
	let checkin_name = '';
	let checkin_photo = '';
	let checkout_name = '';
	let checkout_photo = '';
	
	let last_timer = 0;

	async function submit(empno){
		let punch = {
			id: uuidv4(),
			empno: empno,
			time: new Date(),
		};
		punch.photo = canvas.toDataURL("image/jpeg");
		employee = await electronSvr.punch(punch);

		if (employee) {
			console.log(employee);

			video.style.zIndex = "1";
			canvas.style.zIndex = "2";

			state = employee.action;
			if (employee.active == 0){
				warnings = ['Account Disabled', '此卡无效'];
			}

			if (last_timer != 0) {
				clearTimeout(last_timer);
				last_timer = 0;
			}

			let timeOut = warnings ? globalThis.config.warningCanvasTimeout : globalThis.config.canvasTimeout;
			last_timer = setTimeout(function() {
				state = 'clock';
				warnings = null;
				last_timer = 0;

				video.style.zIndex = "2";
				canvas.style.zIndex = "1";
			}, timeOut);
		
			//save to fb
			if (employee.active != 0){
				punch.employee_id = employee.id;
				punch.action = employee.action;
				punch.store_id = globalThis.config.storeId;
				punch.store = globalThis.config.store;
				punch.node = globalThis.config.hostname;
				punch.created_at = punch.time;
				punch.updated_at = punch.time;
				punch.state = "created";
				punch.photo_md5 = null;
				punch.photo_url = null;
				await savePunch(punch);
			}
		}
	}

	let warnings = null;
	let state = "clock";
	let employee;
	$: {
		if (state=='clock'){
			checkin_name = '';
			checkin_photo = '';
			checkout_name = '';
			checkout_photo = '';
		}

		if (state == "checkin"){
			checkin_name = '';
			checkin_photo = 'image/enter.jpg';
			checkout_name = employee.name;
			checkout_photo = `employees/${employee.id}.jpg`;
		}
		if (state == "checkout"){
			checkin_name = employee.name;
			checkin_photo = `employees/${employee.id}.jpg`;
			checkout_name = '';
			checkout_photo = 'image/exit.jpg';
		}
	}
	onDestroy(() => {
		if (last_timer != 0) {
			clearTimeout(last_timer);
        	last_timer = 0;
		}

		if (interval != 0) {
			clearInterval(interval);
        	interval = 0;
		}
	});

	onMount(async () => {
		//debug
		/*
		checkin_name = 'Don Smith';
		checkin_photo = 'image/enter.jpg';
		checkout_name = 'Don Smith';
		checkout_photo = 'image/exit.jpg';
		*/

		context = canvas.getContext('2d');
		video.onplay = function() {
		};
			  
		video.onresize = function(){
			console.log("resize camera");
			cameraWidth = video.videoWidth;
			cameraHeight = video.videoHeight;
			if (canvas) {
				canvas.width = cameraWidth;
				canvas.height = cameraHeight;
			}
		}
		
		if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia({video: true, audio: false })
				.then(function(stream) {
					if (video){
						video.srcObject = stream;
						video.play();
					}
				})
				.catch(function(err) {
					console.log(err);
				}
			);
		}

		setDt();
		interval = setInterval(setDt, 1*1000);
	});

	function convertImageToCanvas(image) {
		canvas.width = image.width;
		canvas.height = image.height;
		canvas.getContext("2d").drawImage(image, 0, 0);
		return canvas;
	}

	function convertCanvasToImage(canvas) {
		var image = new Image();
		image.src = canvas.toDataURL("image/jpeg");
		return image;
	}

	function convertCanvasToBlob(canvas) {
		return new Promise(function(resolve, reject) {
			canvas.toBlob((blob)=>{
				resolve(blob);
			}, 'image/jpeg', 0.95);
  		});
	}

	let barcode;
	function keypress(e){
		//console.log(e);
		if ((e.key == '!')||(e.key == 'Enter')){
			var empno = barcode.value;
			if (empno == 'admin@@@'){
				mode = 'admin';
			}
			else {
				////DEBUG  
				//empno = 'EMP08226';		//active=0
				//empno = 'EMP08228';	//active=1

				empno = empno.match(/EMP\d+/);
				if ((empno) && (empno[0])) {
					if (context) context.drawImage(video, 0, 0, cameraWidth, cameraHeight);					
					submit(empno[0]);
				}
			}

			barcode.value = '';
			return false;
		}
	}

	let strDate = "";
	let strTime = "";
	let interval = 0;

	function setDt(){
		var now = new Date();
		//change when the seconds is 0, if you want less notification
		//if (strDate=="" || now.getSeconds()==0){
		if (true){
			strDate = now.toLocaleDateString('en-US',{year: 'numeric', month:'2-digit', day:'2-digit', weekday:'long'}).replace(',', '');
			strTime = now.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
		}
		if (barcode) barcode.focus();
	}
</script>

<div class="flex flex-grow flex-col">
	<header class="flex">
		<div class="flex justify-center w-1/4 text-5xl" id="store">{globalThis.config ? globalThis.config.store : ''}</div>
		<div class="flex-grow">
			<section class="flex justify-center font-bold text-7xl text-red-600" id="time">{strTime}</section>
		</div>
		<div class="flex justify-center w-1/4 text-5xl" id="date" >{strDate}</div>
	</header>
	<main class="flex flex-grow">
		<div class="flex flex-col justify-center items-center" style="width:240px">
			<img aria-label='checkin_photo' class="rounded-md" src={checkin_photo} alt="" />
			<div aria-label='checkin_name' class="text-3xl">{checkin_name}</div>
		</div>
		
		<div class="flex-grow flex flex-col justify-center items-center">
			{#if warnings}
				<div id="warnings" class="flex justify-center content-center font-bold text-6xl bg-yellow-200 text-red-600 mt-10">
					<SwapText texts={warnings} />
				</div>
			{/if}
			<video bind:this={video} style="position:absolute;z-index:1};" controls autoplay>
				<track kind="captions"/>
			</video>
			<canvas bind:this={canvas} style="position:absolute;z-index:2};"></canvas>
			<div class="flex-grow" id="place holder fillup"></div>
			{#if !warnings}
				<input id="barcode" class="w-full md:w-1/2 bg-blue-200 rounded-md" type="password" bind:this={barcode} on:keypress={keypress}>
			{/if}
		</div>
		
		<div class="flex flex-col justify-center items-center" style="width:240px">
			<img aria-label='checkout_photo' class="rounded-md" src={checkout_photo} alt="">
			<div aria-label='checkout_name' class="text-3xl">{checkout_name}</div>
		</div>
	</main>
</div>
