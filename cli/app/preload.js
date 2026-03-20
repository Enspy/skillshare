'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getState:       ()       => ipcRenderer.invoke('get-state'),
  register:       (u)      => ipcRenderer.invoke('register', u),
  installSkill:   (id)     => ipcRenderer.invoke('install-skill', id),
  getLocalSkills: ()       => ipcRenderer.invoke('get-local-skills'),
  sendSkill:      (data)   => ipcRenderer.invoke('send-skill', data),
  syncSkills:     ()       => ipcRenderer.invoke('sync-skills'),
  resize:         (h)      => ipcRenderer.invoke('resize', h),
  onRefresh:      (cb)     => ipcRenderer.on('refresh', () => cb()),
  acceptFriend:   (data)   => ipcRenderer.invoke('accept-friend', data),
  declineFriend:  (id)     => ipcRenderer.invoke('decline-friend', id),
  addFriend:      (to)     => ipcRenderer.invoke('add-friend', to),
});
