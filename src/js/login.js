const { ipcRenderer } = require('electron')

const Client = {
    ws : null,
    guid : 0,
    username:null,
    storeUserGuid: function (guid) {
        const _self = this;
        Client.guid = guid;
        let existingGuid = localStorage.getItem('electronGuid',guid);     
        if(!existingGuid){
            localStorage.setItem('electronGuid', guid);
        }
        else{
            Client.guid = existingGuid;
            let guidData = {
                type: 'updateClientGuid',
                payload: { 
                    guid: existingGuid
                }
            }
            _self.ws.send(JSON.stringify(guidData));
        }
    },
    updateConnectionStatus: function (connected) {
        if(connected){
            document.getElementById('connectionText').textContent = 'Connected';
            document.getElementById('connectionStatusBox').className = 'connected';
        }
        else{
            document.getElementById('connectionText').textContent = 'Disconnected';
            document.getElementById('connectionStatusBox').className = 'notConnected';
        }
    },
    storeUsernameForGuid: function (payload) {
        localStorage.setItem(payload.guid,payload.username)
    },
    initConnection: function () {
        let _self = this;
        if(!_self.ws){
            _self.ws = new WebSocket('ws://localhost:27015');
            _self.ws.addEventListener('open',()=>{           
                _self.ws.addEventListener('message', function (event) {        
                    let message = JSON.parse(event.data);
                    if(message && message.type){
                        switch (message.type) {
                            case 'connectionSuccess':
                                _self.updateConnectionStatus(true)
                                _self.storeUserGuid(message.payload.guid);
                                _self.sendUserDataForConnection()
                                break;
                            case 'loginSuccess':
                                _self.storeUsernameForGuid(message.payload);
                                _self.openDashboard();
                                break;
                            case 'guidUpdated':
                                _self.updateGuid(message.payload.guid);
                                break;
                            
                            default:
                                console.log('unkown message received');
                                console.log(message);
                                
                                break;
                        }
                    }
                });
                
            })
        }
        
    },
    
    initClient : function () {
        this.prepareLoginScreen();
        let themeSelected = localStorage.getItem('lightTheme');
        if(themeSelected=='true'){
            setTimeout(function () {
                document.getElementById('lightTheme').click()
            },0)
        }
    },
    openDashboard: function () {
        ipcRenderer.invoke('open-view', 'dashboard')
    },
    sendUserDataForConnection: function () {
        let userData = {
            type: 'login',
            payload: { 
                username: Client.username,
                clientGuid : Client.guid
            }
        }
        this.ws.send(JSON.stringify(userData));
    },
    prepareLoginScreen: function () {
        let loginBtn = document.getElementById('button');
        let _self = this;
        document.getElementById('loginBtn').addEventListener('click', function (event) {
            event.preventDefault();
            if(_self.validateLoginForm()){
                _self.username = document.getElementById('usernameInput').value
                _self.initConnection();
            }
            return false;
        });
        document.getElementById('usernameInput').addEventListener('keyup', function (event) {
            if(!this.value) this.classList.add('error')
            else this.classList.remove('error')
        });
        document.getElementById('serverUrlInput').addEventListener('keyup', function (event) {
            if(!this.value) this.classList.add('error')
            else this.classList.remove('error')
        });
    },
    validateLoginForm: function () {
        let usernameInput = document.getElementById('usernameInput');
        let serverUrlInput = document.getElementById('serverUrlInput');
        let username = usernameInput.value;
        let password = serverUrlInput.value;

        if(!username) usernameInput.classList.add('error')
        else usernameInput.classList.remove('error')
        if(!password) serverUrlInput.classList.add('error')
        else serverUrlInput.classList.remove('error')

        return document.getElementById('loginForm').checkValidity();
    }
}

Client.initClient();