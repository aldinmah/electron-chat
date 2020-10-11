const express = require('express')
const http = require('http')
const path = require('path')

const {
    app,
    BrowserWindow,
    Menu,
    ipcMain
} = require('electron')

const expressApp = express()
const port = 3000

expressApp.use(express.static(__dirname))
expressApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/views/index.html'))
})
expressApp.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname + '/views/dashboard.html'))
})

function createWindow() {
    
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 400,
        webPreferences: {
            nodeIntegration: true,
            worldSafeExecuteJavaScript: true
        }
    })

    mainWindow.loadFile('views/index.html');
    //mainWindow.webContents.openDevTools()

    ipcMain.handle('open-view', (event, viewName) => {
        mainWindow.loadFile('views/'+viewName+'.html');
    })
}

app.whenReady().then(createWindow)