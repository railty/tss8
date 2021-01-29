export async function savePunch(punch) {
    let {photo, ...data} = punch;
    let punchRef = firebaseDb.collection("punches").doc(punch.id);
    await punchRef.set(data);

    punchRef = firebaseDb.collection("stores").doc(punch.store_id.toString()).collection("employees").doc(punch.employee_id.toString()).collection("punches").doc(punch.id.toString());
    await punchRef.set(data);

    let storageRef = filebaseStorage.ref();
    let cameraRef = storageRef.child(`camera/${punch.id}.jpeg`);

    let ref = await cameraRef.putString(photo, 'data_url');
    let url = await ref.ref.getDownloadURL();
    //console.log(`camera/${punch.id}.jpeg`);
    //console.log(url);

    await punchRef.update({
        photo_url: url
    })
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
