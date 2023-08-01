
const form = document.getElementById("room-name-form");
const roomNameInput = document.getElementById("room-name-input");
const container = document.getElementById("video-container");

const staetRoom = async (event) => {
    event.preventDefault();
    form.style.visibility = "hidden";

    const roomName = roomNameInput.value;

    const response = await fetch("/join-room",{
        method: "POST",
        headers: {
            Accept:"application/json",
            "Content-type": "application/json"
        },
        body: JSON.stringify({
            roomName: roomName
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
    participantDiv.classList.add("col", "m-2", "rounded-2", "border-5", "border-primary")
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
        const name = document.createElement("p");
        name.classList.add("name");
        name.append( document.createTextNode("Your name"));
        participantDiv.append("name");
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
    // join the video room with the Access Token and the given room  name
    const room = await Twilio.Video.connect(token, {room: roomName});
    return room;
}

form.addEventListener("submit", staetRoom);