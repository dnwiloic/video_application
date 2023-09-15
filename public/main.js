
const form = document.getElementById("room-name-form");
const roomNameInput = document.getElementById("room-name-input");
const userNameInput = document.getElementById("user-name-input");

const container = document.getElementById("video-container");

let videoRoom ;
 
window.setInterval(  async () => {
    console.log("getting video room")
    const response = await fetch("/video-room");
    videoRoom = response.json();
    console.log("video room :");
    console.log(videoRoom)
}, 5000);

const staetRoom = async (event) => {
    event.preventDefault();
    form.style.visibility = "hidden";

    const roomName = roomNameInput.value;
    const userName = userNameInput.value;

    const response = await fetch("/join-room",{
        method: "POST",
        headers: {
            Accept:"application/json",
            "Content-type": "application/json"
        },
        body: JSON.stringify({
            roomName: roomName,
            userName: userName
        })
    });

    const {token} = await response.json();
    
    // join video room with the token
    const room = await joinVideoRoom(roomName,token)
    
    // render the locale and remote participants video and audio  tracks

    handleConnectedParticipant(room.localParticipant);
    room.participants.forEach(handleConnectedParticipant);
    room.on("participantConnected",handleConnectedParticipant);

    // handle cleanup whem a participant disconnects
    room.on("participantDisconnectd", handleDisconnectedParticipant);
    window.addEventListener('pagehide', () => room.disconnect());
    window.addEventListener('beforeunload', () => room.disconnect());

};

const handleConnectedParticipant = (participant) =>{
    // create a div for this participant tracks
    const participantDiv = document.createElement("div");
    participantDiv.setAttribute("id", participant.identify);
    participantDiv.classList.add("video-participant","col", "m-2", "rounded-2", "border-5", "border-primary")
    container.appendChild(participantDiv);

    // iterate through the participant's published tracks  and
    // call 'handleTrackPublication' on then
    console.log("participant: ", participant)
    participant.tracks.forEach( trackPublication => {
        console.log("tracksPublication: ", trackPublication)
        handleTrackPublication(trackPublication, participant);
    });

    participant.on('trackPublished', handleTrackPublication);
};

const handleTrackPublication = (trackPublication, participant) => {
    function displayTrack(track){
        // append this track to the participant's div and render it on the page
        const participantDiv = document.getElementById(participant.identify);
        
        // track.attach create an HTMLVideoElement or HTMLAuudioElement
        // (depending on the type of track) and  adds  the video or audio stream
        participantDiv.append(track.attach());
        // add the participant name
        if(track.kind === "video"){
            setTimeout(() => {
                participantDiv.classList.add('live');
              }, 2000);
            const name = document.createElement("p");
            name.classList.add("name");
            name.append( document.createTextNode(participant.identity));
            participantDiv.append(name);
        }
    }

    // check if the trackPublication contains a `track` attribute. If it does,
    // we are subscribed to this track. If not, we are not subscribed.
    if(trackPublication.track){
        displayTrack(trackPublication.track)
    }

    // listen for any new subscriptions to this track publication
    trackPublication.on("subscribed", displayTrack)
}

handleDisconnectedParticipant = (participant) => {
    // stop listening for this participant
    participant.removeAllListeners();
    // remove this participant's div from the page 
    const participantDiv = document.getElementById(participant.identify)
    participantDiv.remove();

}

const joinVideoRoom = async (roomName, token) => {

    const callDiv = document.getElementById("call-div");
    const message = document.createElement("div");
    message.classList.add("alert", "alert-success");
    message.append( document.createTextNode(`a room name is "${roomName}" share it with other participant`));
    callDiv.append(message);


    const userName = userNameInput.value;
    console.log(userName)
    // join the video room with the Access Token and the given room  name
    const room = await Twilio.Video.connect(token, {room: roomName, identity: userName});
    return room;
}

form.addEventListener("submit", staetRoom);