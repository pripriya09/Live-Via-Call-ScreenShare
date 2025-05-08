import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

const AgentView = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const sharedScreenRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  useEffect(() => {
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play().catch(err => console.warn('Local play error:', err));
        }

        const pc = new RTCPeerConnection(config);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.track.kind === 'video' && event.streams[0] !== localStream) {
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
        alert('Failed to initialize. Check DroidCam and permissions.');
      }
    }
    init();
  }, []);

  const acceptCall = async (offer) => {
    if (!peerConnection || !isInitialized) return;
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', answer);
    } catch (err) {
      console.error('Error accepting call:', err);
    }
  };

  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setIsScreenSharing(false);
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (sharedScreenRef.current) sharedScreenRef.current.srcObject = null;
      socket.emit('end-call');
      socket.emit('clear-form'); // Emit event to clear form on client side
      setFormData({ name: '', email: '' }); // Clear form on agent side
      setIsInitialized(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);
    socket.emit('form-update', updatedFormData);
  };

  const handleAgentSubmit = (e) => {
    e.preventDefault();
    console.log('Agent form submitted:', formData);
    socket.emit('form-submit', formData);
    alert('Form submitted by agent!');
  };

  useEffect(() => {
    socket.on('offer', (offer) => {
      acceptCall(offer);
    });

    socket.on('ice-candidate', (candidate) => {
      if (peerConnection) peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('end-call', () => {
      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(null);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (sharedScreenRef.current) sharedScreenRef.current.srcObject = null;
        setIsInitialized(false);
      }
      setFormData({ name: '', email: '' }); // Clear form on agent side
    });

    socket.on('screen-shared', () => {
      setIsScreenSharing(true);
      alert('Client is sharing their screen.');
      if (peerConnection && sharedScreenRef.current) {
        peerConnection.getReceivers().forEach(receiver => {
          if (receiver.track.kind === 'video' && receiver.track !== localStream.getVideoTracks()[0]) {
            sharedScreenRef.current.srcObject = new MediaStream([receiver.track]);
            sharedScreenRef.current.play().catch(err => console.error('Shared screen play error:', err));
          }
        });
      }
    });

    socket.on('screen-ended', () => {
      setIsScreenSharing(false);
      if (sharedScreenRef.current) sharedScreenRef.current.srcObject = null;
    });

    socket.on('form-update', (data) => {
      setFormData(data);
    });

    socket.on('form-submit', (data) => {
      console.log('Form submitted by client:', data);
      alert('Client submitted form. Review and submit if correct.');
    });

    socket.on('clear-form', () => {
      setFormData({ name: '', email: '' }); // Clear form when client ends call
    });

    return () => {
      socket.off('offer');
      socket.off('ice-candidate');
      socket.off('end-call');
      socket.off('screen-shared');
      socket.off('screen-ended');
      socket.off('form-update');
      socket.off('form-submit');
      socket.off('clear-form');
    };
  }, [peerConnection]);

  return (
    <div>
      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted /> {/* Agent's video */}
        <video ref={remoteVideoRef} autoPlay /> {/* Client's live video */}
        <video ref={sharedScreenRef} autoPlay /> {/* Client's shared form screen */}
      </div>
      <button onClick={endCall} disabled={!isInitialized}>End Call</button>
      <div className="form-container">
        <h3>Agent Form Review</h3>
        <form onSubmit={handleAgentSubmit}>
          <label>
            Name:
            <input type="text" name="name" value={formData.name} onChange={handleChange} />
          </label>
          <br />
          <label>
            Email:
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </label>
          <br />
          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
};

export default AgentView;