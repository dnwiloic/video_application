require("dotenv").config();
const {v4: uuidv4 } =require("uuid")
const twilio = require("twilio")
const cors = require("cors")
const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const express = require("express");
const SITE_URL = process.env.SITE_URL;

const app = express()   
const port = 5000;

app.use(cors())
 // use the express JSON middleware
 app.use(express.json())

 // Create the twilioClient
 
 const twilioClient = twilio(
    process.env.TWILIO_API_KEY_SID,
    process.env.TWILIO_API_KEY_SECRET,
    {accountSid: process.env.TWILIO_ACCOUNT_SID}
 )
 const videoRoom = {}

  const handleStatusCallBack =  async(statusCallback) => {
    // Process the callback data based on the event.
    videoRoom = statusCallback;
    return videoRoom;
   const roomSid = statusCallback.RoomSid;
   try{
        videoRoom.roomSid = roomSid;
       if(true){
           const event = statusCallback.StatusCallbackEvent;
           const participantIdentity = statusCallback.ParticipantIdentity ;
           

           switch(event){
               case 'room-created':
                   // Handle room creation event.
                   const roomCreateDate = new Date();
                   videoRoom.start_date = roomCreateDate;
                   break;

               case 'room-ended':
                   // Handle participant connection event.
                   const roomDuration = statusCallback.RoomDuration;
                   const roomEnd = new Date();
                   videoRoom.end_date = roomEnd;
                   videoRoom.duration = roomDuration
                   break;

               case 'participant-connected' :
                   if(participantIdentity){
                       if(!videoRoom[participantIdentity] || !videoRoom[participantIdentity].first_connection){
                           videoRoom[participantIdentity].first_connection = new Date();
                           videoRoom[participantIdentity].duration = 0;
                       }

                   }
               
                   break;

               case 'participant-disconnected' :
                   if(participantIdentity){
                       const disconnectedDate = new Date()
                       const participantDuration =  statusCallback.ParticipantDuration
                        videoRoom[participantIdentity].duration = videoRoom[participantIdentity].duration + participantDuration;
                        videoRoom[participantIdentity].last_disconnsction = disconnectedDate;
                   }

                   break;
           }
       }
   }catch(error){
       return error
   }
   
   console.log(videoRoom)
  
   return { success: true };
}

 const findOrCreateRoom = async (roomName) => {
    try {
        // see if the room exists already. If it doesn't, this will throw
        // error 20404.
        await twilioClient.video.v1.rooms(roomName).fetch();
    } catch(error){
        if(error.code = 20404){
            await twilioClient.video.v1.rooms.create({
                uniqueName: roomName,
                type: "group",
                recordParticipantsOnConnect: true,
                statusCallbackMethod: 'POST',
                statusCallback:SITE_URL+"/room-event"
            });
        } else {
            // let another error bubble up
            throw error;
        }
    }
 }

 const getAccessToken = (rootName, userName) => {
    // create an accessToken
    const token = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_API_KEY_SID,
        process.env.TWILIO_API_KEY_SECRET,
        //generate a random unique identify for this participant
        {identity: userName}
    );

    // create a video grant for this specific room
    const videoGrant = new VideoGrant({
        room: rootName
    });

    //add the video grant
    token.addGrant(videoGrant);
    // serialize the token and return it
    return token.toJwt();
 }

 app.post("/join-room", async (req, res) => {
    // return 400 if the request has an empty body or no roomName
    if(!req.body || !req.body.roomName ){
        return res.status(400).send("Must include rootName argument.");
    }

    const roomName = req.body.roomName;
    const userName = req.body.userName;
    // find or create a room with a given roomName
    findOrCreateRoom(roomName);
    // generate a access Token for a participant in this room 
    const token = getAccessToken(roomName, userName);
    res.send({
        token: token
    });
 });

 app.post("/room-event", async (req, res) => {
    const res = await handleStatusCallBack(req.body)
    res.status(200).send();
 })

 app.get('/video-room', async (req, res) => {
    res.status(200).send(videoRoom);
 })
 // sserve static files from the public directory
 app.use(express.static("public"));

 app.get("/", (req, res) =>{
    res.sendFile("public/index.html");
 });
 

 app.listen(port, () => console.log(`Express server running on port ${port}`));