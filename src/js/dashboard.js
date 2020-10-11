const {
    ipcRenderer
} = require('electron')

const Dashboard = {
    ws: null,
    guid: 0,
    userData: {},
    appStatusData: {},
    activeChatUser: {},
    username: {},
    keepAliveInterval : 0,
    keepAliveIntervalTime : 5000,
    isAlive: false,
    keepAlive: function () {
        const _self = this;
        clearInterval(_self.keepAliveInterval);
        _self.keepAliveInterval = setInterval(function () {
            if(_self.ws && _self.ws.readyState)
                _self.updateConnectionStatus(_self.ws.readyState === _self.ws.OPEN);
            else{
                _self.initConnection()
            }
        },_self.keepAliveIntervalTime)
    },
    storeUserGuid: function (guid) {
        const _self = this;
        _self.guid = guid;
        let existingGuid = localStorage.getItem('electronGuid', guid);
        if (!existingGuid) {
            localStorage.setItem('electronGuid', guid);
        } else {
            let username = localStorage.getItem(existingGuid) ? localStorage.getItem(existingGuid) : 'User_' + Date.now();
            _self.username = username;
            _self.guid = existingGuid;
            _self.username = localStorage.getItem(existingGuid)

            let guidData = {
                type: 'updateClientGuid',
                payload: {
                    guid: existingGuid,
                    username: _self.username
                }
            }
            _self.ws.send(JSON.stringify(guidData));
        }
        document.getElementById('guidValue').textContent = _self.guid

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
    initDashboard: function () {
        let _self = this;
        let themeSelected = localStorage.getItem('lightTheme');
        if(themeSelected=='true'){
            setTimeout(function () {
                document.getElementById('lightTheme').click()
            },0)
        }
        _self.initConnection();
        document.getElementById('sendMessage').addEventListener('click', function (event) {
            let message = document.getElementById('messageInput').value;
            document.getElementById('messageInput').value = '';
            if (message && _self.activeChatUser) {
                _self.generateMessageHtml(message,Date.now(),true)
                let messageData = {
                    type: 'messageSent',
                    payload: {
                        senderGuid: _self.guid,
                        receiverGuid: _self.activeChatUser,
                        senderUsername: _self.username,
                        message: message
                    }
                }
                _self.ws.send(JSON.stringify(messageData));
            }
            return false;
        });
        document.getElementById('messageInput').addEventListener('focus',function (event) {
            document.getElementById(_self.activeChatUser).classList.remove('newMessage')
        })
    },
    initConnection: function () {        
        let _self = this;
        if (!_self.ws) {
            _self.ws = new WebSocket('ws://localhost:27015');
            _self.keepAlive();
            _self.ws.addEventListener('open', () => {
                _self.ws.addEventListener('message', function (event) {
                    let message = JSON.parse(event.data);
                    if (message && message.type) {
                        switch (message.type) {
                            case 'connectionSuccess':
                                _self.updateConnectionStatus(true);
                                _self.storeUserGuid(message.payload.guid);
                                break;
                            case 'receiveUserData':
                                _self.storeUserData(message.payload.userData)
                                break;
                            case 'refreshAppData':
                                _self.refreshDashboard(message.payload.appStatusData)
                                break;
                            case 'messageReceived':
                                _self.messageReceived(message.payload)
                                break;
                            case 'chatHistoryReceived':
                                _self.loadMessagesIntoGrid(message.payload)
                                break;
                            case 'serverAlive':
                                _self.updateConnectionStatus(message.payload.alive)
                                break;
                            case 'errorReceived':
                                alert(message.payload.message)
                                break;
                            default:
                                console.log('unkown message received');
                                console.log(message);

                                break;
                        }
                    }
                });

            })
            _self.ws.addEventListener('close',() => {
                _self.ws = null;
                _self.updateConnectionStatus(false)
            })
            _self.ws.addEventListener('error',() => {
                _self.ws = null;
                _self.updateConnectionStatus(false)
            })
        }

    },
    loadMessagesIntoGrid: function (chatHistoryData) {
        const _self = this;
        document.getElementById('messageList').innerHTML = '';
        
        chatHistoryData.chatHistory.forEach((item) => {
            _self.generateMessageHtml(item.message,item.timestamp,(item.senderGuid==_self.guid))
        })
    },
    messageReceived: function (messageData) {
        let messageFromGuid = messageData.senderGuid;
        document.getElementById(messageFromGuid).classList.add('newMessage');
        if(this.activeChatUser == messageFromGuid && messageFromGuid!=this.guid)
            this.generateMessageHtml(messageData.message,messageData.timestamp)
       
    },
    generateMessageHtml: function (messageText,timestamp,isPersonal) {
        let chatMessage = document.createElement('div');
        let message = document.createElement('span');
        let msgDate = document.createElement('span')
        message.className = 'message';
        msgDate.className = 'msgDate'
        if(isPersonal){
            message.classList.add('personalMessge');
        }
        msgDate.innerHTML = this.getDateTimeFromTimestamp(timestamp)
        message.innerHTML = messageText;
        message.appendChild(msgDate)
        chatMessage.appendChild(message)
        chatMessage.className = 'chatMessage';
        document.getElementById('messageList').appendChild(chatMessage);
    },
    storeUserData: function (userData) {
        this.userData = userData;
    },
    refreshDashboard: function (appStatusData) {
        let _self = this;
        this.appStatusData = appStatusData;
        document.getElementById('onlineUsers').textContent = appStatusData.numberOfClients;

        document.getElementById('userList').innerHTML = '';
        appStatusData.clients.forEach(function (item) {
            let li = document.createElement('li');
            li.className = 'clientItem';
            li.id=item.guid;
            li.setAttribute('userguid', item.guid);
            li.setAttribute('username', item.username);

            let userImg = document.createElement('span');
            userImg.className = 'userLogo guidElement';
            userImg.setAttribute('userguid', item.guid);
            userImg.setAttribute('username', item.username);
            let span = document.createElement('span');
            span.textContent = item.username;
            span.className = 'guidElement'
            span.setAttribute('userguid', item.guid);
            span.setAttribute('username', item.username);
            let newMsg = document.createElement('span');
            newMsg.textContent = 'New message!'
            newMsg.className = 'notice'
            li.appendChild(userImg);
            li.appendChild(span);
            li.appendChild(newMsg);
            document.getElementById('userList').appendChild(li);
        });

        document.querySelectorAll('.clientItem').forEach(item => {
            item.addEventListener('click', event => {
                event.stopPropagation();
                let elems = document.querySelectorAll('.selected');
                elems.forEach(element => {
                    element.classList.remove('selected');
                });
                if(event.target.tagName=='LI'){
                    event.target.classList.add('selected');
                    event.target.classList.remove('newMessage')
                }
                else{
                    event.target.parentNode.classList.add('selected');
                    event.target.parentNode.classList.remove('newMessage')
                }

                _self.activeChatUser = event.target.getAttribute('userguid');
                document.getElementById('chatTargetUserGuid').textContent = event.target.getAttribute('username');
                
                if (_self.activeChatUser) {
                    let chatHistoryRequest = {
                        type: 'chatHistoryRequest',
                        payload: {
                            clientGuid: _self.guid,
                            targetGuid: _self.activeChatUser
                        }
                    }
                    _self.ws.send(JSON.stringify(chatHistoryRequest));
                }
            })
        })
    },
    getDateTimeFromTimestamp: function (timestamp){
        let a = new Date(timestamp);
        let months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        let year = a.getFullYear();
        let month = months[a.getMonth()];
        let date = a.getDate();
        let hour = a.getHours();
        let min = a.getMinutes();
        let sec = a.getSeconds();
        let time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
        return time;
      }
}
Dashboard.initDashboard();