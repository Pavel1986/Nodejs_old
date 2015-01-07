var Socket = io();

/******** Socket events *********/

Socket.on('error', function (reason){

    var InfoData = new Object()
    InfoData.MessageType = "Error";
    InfoData.MessageTitle = "Authorization error";
    InfoData.MessageContent = "For site properly work, cookies must be enabled in browser.";

    MainModule.ShowAlertWindow(InfoData);
});

Socket.on('UserInfoMessage', function (InfoData) {
    MainModule.ShowAlertWindow(InfoData);
});

Socket.on('UserRedirect', function (Location) {

    if(Location["Url"]){
        window.location=Location["Url"];
    }
});

Socket.on('SessionOver', function (Location) {
    alert('Your session is over. Please, reload the page');
});

/*********************************/

var SocketModule = {};

SocketModule.SendEmit = function(Socket, Event, arParams){

    if(Socket.socket.connected === true){

        Socket.emit(Event, arParams);
    }else{
        alert("Connection is over");
    }
}
