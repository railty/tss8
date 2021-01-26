const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronSvr', {
    getConfig: async () => {
        return await ipcRenderer.invoke('getConfig');
    },
    punch: async (arg) => {
        return await ipcRenderer.invoke('punch', arg);
    },
    readConfig: async () => {
        return await ipcRenderer.invoke('readConfig');
    },
    writeConfig: async (config) => {
        return await ipcRenderer.invoke('writeConfig', config);
    },
    getLocalPunches: async () => {
        return await ipcRenderer.invoke('getLocalPunches');
    },
    getLocalEmployees: async () => {
        return await ipcRenderer.invoke('getLocalEmployees');
    },
    upsertLocalEmployee: async (employee) => {
        return await ipcRenderer.invoke('upsertLocalEmployee', employee);
    },
    savePhoto: async (id, dataUrl) => {
        return await ipcRenderer.invoke('savePhoto', id, dataUrl);
    },
    loadPhotos: async () => {
        return await ipcRenderer.invoke('loadPhotos');
    },
    receive: (channel, func) => {
        console.log(channel);
        let validChannels = ["fromServer"];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
})