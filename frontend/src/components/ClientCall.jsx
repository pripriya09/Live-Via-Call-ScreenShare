import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const socket = io('http://localhost:3000');

const ClientCall = () => {
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [videoSender, setVideoSender] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [callActive, setCallActive] = useState(false);
  const navigate = useNavigate();

  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const initialize = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      const pc = new RTCPeerConnection(config);
      stream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, stream);
        if (track.kind === 'video') setVideoSender(sender);
      });
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          const incomingStream = event.streams[0];
          if (remoteVideoRef.current.srcObject !== incomingStream) {
            remoteVideoRef.current.srcObject = incomingStream;
            remoteVideoRef.current.play().catch(err => console.error('Remote play error:', err));
          }
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
      setIsInitialized(false);
    }
  };

  useEffect(() => {
    initialize();
  }, []);

  const startCall = async () => {
    if (!isInitialized || !peerConnection) {
      await initialize();
      if (!peerConnection) return;
    }
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('offer', offer);
      setCallActive(true);
    } catch (err) {
      console.error('Error starting call:', err);
      alert('Failed to start call. Please try again.');
      setCallActive(false);
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnection || !isInitialized || !videoSender) return;
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      const videoTrack = localStream.getVideoTracks()[0];
      await videoSender.replaceTrack(videoTrack);
      setScreenStream(null);
      setIsScreenSharing(false);
      socket.emit('screen-ended');
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'window', logicalSurface: true },
        });
        setScreenStream(screenStream);
        const screenTrack = screenStream.getVideoTracks()[0];
        await videoSender.replaceTrack(screenTrack);
        setIsScreenSharing(true);
        socket.emit('screen-shared');
        screenTrack.onended = async () => {
          const videoTrack = localStream.getVideoTracks()[0];
          await videoSender.replaceTrack(videoTrack);
          setScreenStream(null);
          setIsScreenSharing(false);
          socket.emit('screen-ended');
        };
      } catch (err) {
        console.error('Error sharing screen:', err);
        alert('Failed to share screen.');
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !isVideoOn;
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !isAudioOn;
      setIsAudioOn(!isAudioOn);
    }
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 1));
  };

  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setIsScreenSharing(false);
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (screenStream) screenStream.getTracks().forEach(track => track.stop());
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      socket.emit('end-call');
      socket.emit('clear-form');
      setIsInitialized(false);
      setLocalStream(null);
      setScreenStream(null);
      setVideoSender(null);
      setCallActive(false);
      setTimeout(() => navigate('/summary'), 500);
    }
  };

  useEffect(() => {
    socket.on('connect', () => console.log('Socket connected in ClientCall:', socket.id));
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
        setCallActive(false);
      }
      setTimeout(() => navigate('/summary'), 500);
    });
    socket.on('trigger-start-call', async () => {
      console.log('Received trigger to start call');
      await startCall();
    });
    return () => {
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('end-call');
      socket.off('trigger-start-call');
      socket.off('connect');
    };
  }, [peerConnection, isInitialized, navigate]);

  return (
    <div>
      <div className="video-container">
        <div>
          <video ref={remoteVideoRef} autoPlay style={{ transform: `scale(${zoomLevel})` }} />
          <p>Agent Video</p>
        </div>
      </div>
      <div className="button-container">
        <button onClick={startCall} disabled={callActive || !isInitialized}>
          <i className="fas fa-phone mr-2"></i> Start Call
        </button>
        <button onClick={toggleScreenShare} disabled={!isInitialized}>
          <i className={isScreenSharing ? "fas fa-stop mr-2" : "fas fa-desktop mr-2"}></i>
          {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        </button>
        <button onClick={toggleVideo} className="video-off">
          <i className={isVideoOn ? "fas fa-video mr-2" : "fas fa-video-slash mr-2"}></i>
          {isVideoOn ? 'Video Off' : 'Video On'}
        </button>
        <button onClick={toggleAudio} className="audio-off">
          <i className={isAudioOn ? "fas fa-microphone mr-2" : "fas fa-microphone-slash mr-2"}></i>
          {isAudioOn ? 'Audio Off' : 'Audio On'}
        </button>
        <button onClick={zoomIn} disabled={zoomLevel >= 2} className="zoom">
          <i className="fas fa-search-plus mr-2"></i> Zoom In
        </button>
        <button onClick={zoomOut} disabled={zoomLevel <= 1} className="zoom">
          <i className="fas fa-search-minus mr-2"></i> Zoom Out
        </button>
        <button onClick={endCall} disabled={!isInitialized} className="end-call">
          <i className="fas fa-phone-slash mr-2"></i> End Call
        </button>
      </div>
      <p>
        <a href="/form" target="_blank">Reopen Form</a>
      </p>
    </div>
  );
};

export default ClientCall;