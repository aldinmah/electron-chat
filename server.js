const WebSocket = require('ws')

const wss = new WebSocket.Server({
    port: 27015
})
function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}
function toEvent(message) {
    try {
        let event = JSON.parse(message)
        this.emit(event.type, event.payload)
    } catch (err) {
        console.log('Not registered as event', err)
    }
}
let clients = {};
let chatMessages = [];

function updateAppStatus() {
    let clientsData = [];

    Object.keys(clients).forEach(function (key) {        
        clientsData.push({guid:key,username:clients[key].username})
    })
    let appData = {
        type: 'refreshAppData',
        payload: { 
            appStatusData: {
                numberOfClients : Object.keys(clients).length,
                clients: clientsData
            }
        }
    }
   
    for (const key of Object.keys(clients)) {
        if(clients[key].connection){
            clients[key].connection.send(JSON.stringify(appData));
        }
    }
}

wss.on('connection', (ws) => {
    let clientGuid = generateGuid();
    ws.clientGuid = clientGuid;
    clients[clientGuid] = {guid:clientGuid, connection:ws, username:null};
    
    let confirmation = {
        type: 'connectionSuccess',
        payload: { 
            guid: clientGuid
        }
    }
    ws.send(JSON.stringify(confirmation));

    ws.on('message', toEvent)
        .on('login', function (data) {
            let loginResponse = {
                type: 'loginSuccess',
                payload: { 
                    username: data.username,
                    guid : data.clientGuid
                }
            }
            ws.send(JSON.stringify(loginResponse));
        })
        .on('updateClientGuid',(data)=>{
            try{
                let username = data.username?data.username:'User_'+Date.now();
                
                delete clients[ws.clientGuid];
                ws.clientGuid = data.guid;
                clients[data.guid] = {guid:data.guid, connection:ws, username:username};
                updateAppStatus()
            }catch(e){
                ws.send(JSON.stringify({type:'errorReceived',payload:{message:e.message}}));
            }
            
        })
        .on('messageSent',(data)=>{
                const messageInfo = {
                    senderGuid: data.senderGuid,
                    receiverGuid: data.receiverGuid,
                    senderUsername : data.senderUsername,
                    message: data.message,
                    timestamp: Date.now()
                }
                
                let messageData = {
                    type: 'messageReceived',
                    payload: messageInfo
                }
                
                chatMessages.push(messageInfo)
                clients[data.receiverGuid].connection.send(JSON.stringify(messageData));
        })
        .on('chatHistoryRequest',(data)=>{
            let requestGuid = data.clientGuid;
            let chatTargetGuid = data.targetGuid;
 
            let conversationHistory = chatMessages.filter(function (item) {
                return (item.senderGuid == requestGuid && item.receiverGuid==chatTargetGuid) || (item.receiverGuid==requestGuid && item.senderGuid==chatTargetGuid);
            });
           
            let chatHistory = {
                type: 'chatHistoryReceived',
                payload: { 
                    senderGuid: data.senderGuid,
                    receiverGuid: data.receiverGuid,
                    chatHistory: conversationHistory
                }
            }
            ws.send(JSON.stringify(chatHistory));
        })
        .on('close', () => {
            delete clients[ws.clientGuid];
            updateAppStatus()
        })
})