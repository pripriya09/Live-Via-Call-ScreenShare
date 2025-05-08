import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

const ClientCall = () => {
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  useEffect(() => {
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);

        const pc = new RTCPeerConnection(config);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            remoteVideoRef.current.play().catch(err => console.error('Remote play error:', err));
          }
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', event.candidate);
          }
        };
        setPeerConnection(pc);
        setIsInitialized(true);
      } catch (err) {
        console.error('Error initializing:', err);
        alert('Failed to initialize. Check camera and permissions.');
      }
    }
    init();
  }, []);

  const startCall = async () => {
    if (!peerConnection || !isInitialized) return;
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('offer', offer);
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  const shareScreen = async () => {
    if (!peerConnection || !isInitialized) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
          logicalSurface: true,
        },
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(screenTrack);
      } else {
        peerConnection.addTrack(screenTrack, screenStream);
      }
      setIsScreenSharing(true);
      socket.emit('screen-shared');
      screenTrack.onended = () => {
        const videoTrack = localStream.getVideoTracks()[0];
        if (sender) sender.replaceTrack(videoTrack);
        else {
          peerConnection.getSenders().forEach(s => {
            if (s.track.kind === 'video') peerConnection.removeTrack(s);
          });
          peerConnection.addTrack(videoTrack, localStream);
        }
        setIsScreenSharing(false);
        socket.emit('screen-ended');
      };
    } catch (err) {
      console.error('Error sharing screen:', err);
      alert('Failed to share screen. Please select the original form tab (/form) and share in full-screen mode for best size.');
    }
  };

  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setIsScreenSharing(false);
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      socket.emit('end-call');
      socket.emit('clear-form'); // Emit event to clear form on client side
      setIsInitialized(false);
    }
  };

  useEffect(() => {
    socket.on('answer', (answer) => {
      if (peerConnection) peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });
  
    socket.on('ice-candidate', (candidate) => {
      if (peerConnection) peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });
  
    socket.on('end-call', () => {
      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(null);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        setIsInitialized(false);
      }
    });
  
    socket.on('trigger-start-call', () => {
      console.log('Received trigger to start call from form page');
      alert('call satrted')
      startCall(); // ✅ Start call when signal received
    });
    return () => {
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('end-call');
      socket.off('trigger-start-call');
    };
  }, [peerConnection, isInitialized]);
  

  return (
    <div>
      <div className="video-container">
        <video ref={remoteVideoRef} autoPlay /> {/* Agent's video */}
      </div>
      <button onClick={startCall} disabled={!isInitialized}>Start Call</button>
      <button onClick={shareScreen} disabled={!isInitialized || isScreenSharing}>Share Screen</button>
      <button onClick={endCall} disabled={!isInitialized}>End Call</button>
      <p><a href="/form" target="_blank">Reopen Form</a></p>
    </div>
  );
};

export default ClientCall;