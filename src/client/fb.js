/*
save to firestore from browser side works nicely with offline support, it even resume uploading when you close/restart app
ie. go offline, do save data, it will hang there, not go to the next line until network resume, it will not raise error either.
when it online agian, it will resume to next line and everything will be fine.
if you go offline, save data, and then close the app, when the network online again and you start the app again, firebase will send the data
to server, that's great, but it will not go the the next line, so the storage picture will not be updated. not a problem of firestore, but 
not what I want.

so the upload photo can only be done at the server side, as there is no/limit support of upload offline functionalilty, (you must start the upload when you online, then you can go offline and later on resume)
so, i will sych the data in the node server side, do increament update.
*/
export async function savePunch(punch) {
    let {photo, ...data} = punch;
    let punchRef = firebaseDb.collection("stores").doc(punch.store_id.toString()).collection("punches").doc(punch.id.toString());
    await punchRef.set(data);
    
    //punchRef = firebaseDb.collection("stores").doc(punch.store_id.toString()).collection("employees").doc(punch.employee_id.toString()).collection("punches").doc(punch.id.toString());
    //await punchRef.set(data);

    /*
    let storageRef = filebaseStorage.ref();
    let cameraRef = storageRef.child(`camera/${punch.id}.jpeg`);

    let ref = await cameraRef.putString(photo, 'data_url');
    let url = await ref.ref.getDownloadURL();
    //console.log(`camera/${punch.id}.jpeg`);
    //console.log(url);

    await punchRef.update({
        photo_url: url
    })
    */
}

export async function getPunches() {
    let punchesSnapshot = await firebaseDb.collection("punches").get();
    let punches = punchesSnapshot.docs.map(x=>x.data());
    return punches;
}

export async function getEmployees() {
    let employeesSnapshot = await firebaseDb.collection("employees").get();
    let employees = employeesSnapshot.docs.map(x=>x.data());

    employees = employees.map((e)=>{
        if(e.created_at) e.created_at = e.created_at.toDate();
        else{
            console.log(e);
        }
        if(e.updated_at) e.updated_at = e.updated_at.toDate();
        else{
            console.log(e);
        }
        return e;
    });
    return employees;
}

export async function uploadPhoto(id, dataUrl){
    console.log(`uploading ${id}`);

    let storageRef = filebaseStorage.ref();
    let photoRef = storageRef.child(`employees/${id}.jpg`);

    if (dataUrl){
      await photoRef.putString(dataUrl, 'data_url');
      let url = await photoRef.getDownloadURL();
      return url;
    }
    return null;
}

export async function updateEmployee(employeeRef, employee){
    console.log("updating " + employee.id);
    await employeeRef.set(employee);
}
