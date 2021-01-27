exports.showMsg = (msg) => {
    global.mainWindow.webContents.send('message', msg);
}