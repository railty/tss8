var admin = require("firebase-admin");

var serviceAccount = require("./tss7-firebase-adminsdk.json");

let app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "tss7-c74db.appspot.com",
  databaseURL: 'https://tss7-c74db.firebaseio.com'
});

async function storage(){
    let bucket = admin.storage().bucket();

    let files = await bucket.getFiles();
    console.log(files.length);

    let files2 = await bucket.getFiles({
        prefix: 'camera/'
    });
    console.log(files2.length);

    files2 = files2[0].map((f)=>{
        return f.name;
    });

    let file1 = bucket.file('camera/c67670b4-b091-4dcb-bed0-8ca8861f9580.jpg');
    let e1 = await file1.exists();
    console.log(e1);
    
    let file2 = bucket.file('camera/c67670b4-b091-4dcb-bed0-8ca8861f9581.jpg');
    let e2 = await file2.exists();
    console.log(e2);
}
async function cloudStore(){
    let db = admin.firestore();

    let punchesSnapshot = await db.collection("stores").doc('999').collection("employees").doc('99999').collection("punches").get();
    console.log(punchesSnapshot.docs.length);

    for (let doc of punchesSnapshot.docs) {
        console.log(doc.data());
        await doc.ref.delete();
    };

}

cloudStore();