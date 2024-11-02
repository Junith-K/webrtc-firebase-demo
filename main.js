import "./style.css";

import firebase from "firebase/app";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBAt3ZwZOZ0RKfc6rgrrTQ7zdCJxINboiQ",
  authDomain: "webrtc-screen-share.firebaseapp.com",
  projectId: "webrtc-screen-share",
  storageBucket: "webrtc-screen-share.firebasestorage.app",
  messagingSenderId: "907154613242",
  appId: "1:907154613242:web:fe5f8c5c515cd128ab7a43",
  measurementId: "G-GRD9VQKK6H",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

const servers = {
  iceServers: [
    { urls: ["stun:bn-turn2.xirsys.com"] },
    {
      username:
        "4yKXXdb9kgdtqlmkDDQl_vLeizHIXpODBNIdvQx69dOiYyI42cZ5m2xnL6tmxujZAAAAAGclPfBqdW5p",
      credential: "3f7aa868-9892-11ef-b580-0242ac140004",
      urls: [
        "turn:bn-turn2.xirsys.com:80?transport=udp",
        "turn:bn-turn2.xirsys.com:3478?transport=udp",
        "turn:bn-turn2.xirsys.com:80?transport=tcp",
        "turn:bn-turn2.xirsys.com:3478?transport=tcp",
        "turns:bn-turn2.xirsys.com:443?transport=tcp",
        "turns:bn-turn2.xirsys.com:5349?transport=tcp",
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById("webcamButton");
const webcamVideo = document.getElementById("webcamVideo");
const callButton = document.getElementById("callButton");
const callInput = document.getElementById("callInput");
const answerButton = document.getElementById("answerButton");
const remoteVideo = document.getElementById("remoteVideo");
const hangupButton = document.getElementById("hangupButton");

// Add more resolutions to the dropdown
const resolutions = [
  { width: 640, height: 360 },
  { width: 640, height: 480 },
  { width: 854, height: 480 },
  { width: 960, height: 540 },
  { width: 1024, height: 576 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
];

const resolutionSelect = document.getElementById("resolution");
resolutions.forEach((res) => {
  const option = document.createElement("option");
  option.value = `${res.width}x${res.height}`;
  option.textContent = `${res.width} x ${res.height}`;
  resolutionSelect.appendChild(option);
});

// Setup frame rate options (0-60)
const fpsSelect = document.getElementById("fps");
for (let i = 0; i <= 60; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = `${i} FPS`;
  fpsSelect.appendChild(option);
}

// 1. Setup media sources
webcamButton.onclick = async () => {
  const resolution = document.getElementById("resolution").value.split("x");
  const width = parseInt(resolution[0]);
  const height = parseInt(resolution[1]);
  const fps = parseInt(document.getElementById("fps").value);

  const constraints = {
    video: {
      width: width,
      height: height,
      frameRate: fps,
    },
    audio: true,
  };

  try {
    localStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    remoteStream = new MediaStream();

    // Push tracks from local stream to peer connection
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Pull tracks from remote stream, add to video stream
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };

    webcamVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;

    callButton.disabled = false;
    answerButton.disabled = false;
    webcamButton.disabled = true;
  } catch (error) {
    console.error("Error accessing media devices:", error);
  }
};

// 2. Create an offer
callButton.onclick = async () => {
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection("calls").doc();
  const offerCandidates = callDoc.collection("offerCandidates");
  const answerCandidates = callDoc.collection("answerCandidates");

  callInput.value = callDoc.id;

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  try {
    // Create offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await callDoc.set({ offer });

    // Listen for remote answer
    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription).catch((error) => {
          console.error("Error setting remote description:", error);
        });
      }
    });

    // When answered, add candidate to peer connection
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate).catch((error) => {
            console.error("Error adding ICE candidate:", error);
          });
        }
      });
    });

    hangupButton.disabled = false;
  } catch (error) {
    console.error("Error creating offer:", error);
  }
};

// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  const callId = callInput.value;
  const callDoc = firestore.collection("calls").doc(callId);
  const answerCandidates = callDoc.collection("answerCandidates");
  const offerCandidates = callDoc.collection("offerCandidates");

  try {
    pc.onicecandidate = (event) => {
      event.candidate && answerCandidates.add(event.candidate.toJSON());
    };

    const callData = (await callDoc.get()).data();
    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await callDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data)).catch((error) => {
            console.error("Error adding ICE candidate:", error);
          });
        }
      });
    });
  } catch (error) {
    console.error("Error accessing media devices:", error);
  }
};
