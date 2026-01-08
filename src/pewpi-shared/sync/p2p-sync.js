/**
 * P2P Sync - WebRTC DataChannel shim for optional peer-to-peer token sync
 * Configurable signaling server and TURN settings
 */

export class P2PSyncManager {
  constructor(options = {}) {
    this.options = {
      signalingUrl: options.signalingUrl || 'wss://signaling.pewpi.io',
      turnServers: options.turnServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN servers as needed
      ],
      enabled: options.enabled !== false,
      autoConnect: options.autoConnect !== false,
      ...options
    };
    
    this.peers = new Map();
    this.signalingConnection = null;
    this.localPeerId = this.generatePeerId();
    
    if (this.options.enabled && this.options.autoConnect) {
      this.initialize();
    }
  }

  /**
   * Initialize P2P sync
   */
  async initialize() {
    console.log('[P2P] Initializing with peer ID:', this.localPeerId);
    
    try {
      // Check WebRTC support
      if (!this.isWebRTCSupported()) {
        console.warn('[P2P] WebRTC not supported in this browser');
        return;
      }
      
      // Connect to signaling server (stub implementation)
      await this.connectToSignaling();
      
      console.log('[P2P] Initialized successfully');
    } catch (error) {
      console.error('[P2P] Initialization failed:', error);
    }
  }

  /**
   * Check if WebRTC is supported
   * @returns {boolean}
   */
  isWebRTCSupported() {
    return !!(
      window.RTCPeerConnection &&
      window.RTCSessionDescription &&
      window.RTCIceCandidate
    );
  }

  /**
   * Connect to signaling server
   */
  async connectToSignaling() {
    return new Promise((resolve, reject) => {
      try {
        // Stub: In production, connect to actual signaling server
        console.log('[P2P] Connecting to signaling server:', this.options.signalingUrl);
        
        // Simulate connection
        setTimeout(() => {
          console.log('[P2P] Signaling server connection stub - implement WebSocket connection');
          this.signalingConnection = { ready: true };
          resolve();
        }, 100);
        
        // In production:
        // this.signalingConnection = new WebSocket(this.options.signalingUrl);
        // this.signalingConnection.onopen = () => resolve();
        // this.signalingConnection.onerror = (err) => reject(err);
        // this.signalingConnection.onmessage = (msg) => this.handleSignalingMessage(msg);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create peer connection
   * @param {string} remotePeerId 
   * @returns {RTCPeerConnection}
   */
  createPeerConnection(remotePeerId) {
    const config = {
      iceServers: this.options.turnServers
    };
    
    const pc = new RTCPeerConnection(config);
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendToSignaling({
          type: 'ice-candidate',
          candidate: event.candidate,
          from: this.localPeerId,
          to: remotePeerId
        });
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[P2P] Connection state with ${remotePeerId}:`, pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        console.log(`[P2P] Successfully connected to peer ${remotePeerId}`);
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.peers.delete(remotePeerId);
      }
    };
    
    return pc;
  }

  /**
   * Create data channel
   * @param {RTCPeerConnection} peerConnection 
   * @param {string} channelName 
   * @returns {RTCDataChannel}
   */
  createDataChannel(peerConnection, channelName = 'pewpi-sync') {
    const dataChannel = peerConnection.createDataChannel(channelName, {
      ordered: true,
      maxRetransmits: 3
    });
    
    dataChannel.onopen = () => {
      console.log('[P2P] Data channel opened:', channelName);
    };
    
    dataChannel.onclose = () => {
      console.log('[P2P] Data channel closed:', channelName);
    };
    
    dataChannel.onmessage = (event) => {
      this.handlePeerMessage(event.data);
    };
    
    dataChannel.onerror = (error) => {
      console.error('[P2P] Data channel error:', error);
    };
    
    return dataChannel;
  }

  /**
   * Connect to a peer
   * @param {string} remotePeerId 
   */
  async connectToPeer(remotePeerId) {
    if (this.peers.has(remotePeerId)) {
      console.log('[P2P] Already connected to peer:', remotePeerId);
      return;
    }
    
    console.log('[P2P] Connecting to peer:', remotePeerId);
    
    const pc = this.createPeerConnection(remotePeerId);
    const dataChannel = this.createDataChannel(pc);
    
    this.peers.set(remotePeerId, { pc, dataChannel });
    
    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // Send offer via signaling
    this.sendToSignaling({
      type: 'offer',
      offer,
      from: this.localPeerId,
      to: remotePeerId
    });
  }

  /**
   * Handle signaling message
   * @param {Object} message 
   */
  async handleSignalingMessage(message) {
    const data = typeof message === 'string' ? JSON.parse(message) : message;
    
    switch (data.type) {
      case 'offer':
        await this.handleOffer(data);
        break;
      case 'answer':
        await this.handleAnswer(data);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(data);
        break;
      default:
        console.warn('[P2P] Unknown signaling message type:', data.type);
    }
  }

  /**
   * Handle offer from peer
   * @param {Object} data 
   */
  async handleOffer(data) {
    const pc = this.createPeerConnection(data.from);
    
    pc.ondatachannel = (event) => {
      const dataChannel = event.channel;
      dataChannel.onmessage = (e) => this.handlePeerMessage(e.data);
      this.peers.set(data.from, { pc, dataChannel });
    };
    
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    this.sendToSignaling({
      type: 'answer',
      answer,
      from: this.localPeerId,
      to: data.from
    });
  }

  /**
   * Handle answer from peer
   * @param {Object} data 
   */
  async handleAnswer(data) {
    const peer = this.peers.get(data.from);
    if (!peer) return;
    
    await peer.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  }

  /**
   * Handle ICE candidate
   * @param {Object} data 
   */
  async handleIceCandidate(data) {
    const peer = this.peers.get(data.from);
    if (!peer) return;
    
    await peer.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  }

  /**
   * Send message to signaling server
   * @param {Object} message 
   */
  sendToSignaling(message) {
    if (!this.signalingConnection) {
      console.warn('[P2P] Signaling connection not ready');
      return;
    }
    
    // Stub: In production, send via WebSocket
    console.log('[P2P] Send to signaling (stub):', message.type);
    
    // In production:
    // this.signalingConnection.send(JSON.stringify(message));
  }

  /**
   * Broadcast data to all connected peers
   * @param {Object} data 
   */
  broadcast(data) {
    const message = JSON.stringify(data);
    let sent = 0;
    
    for (const [peerId, peer] of this.peers.entries()) {
      if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
        try {
          peer.dataChannel.send(message);
          sent++;
        } catch (error) {
          console.error(`[P2P] Failed to send to ${peerId}:`, error);
        }
      }
    }
    
    console.log(`[P2P] Broadcast to ${sent} peers`);
  }

  /**
   * Handle message from peer
   * @param {string} message 
   */
  handlePeerMessage(message) {
    try {
      const data = JSON.parse(message);
      console.log('[P2P] Received message:', data);
      
      // Emit event for application to handle
      const event = new CustomEvent('pewpi.p2p.message', {
        detail: data
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('[P2P] Failed to parse peer message:', error);
    }
  }

  /**
   * Sync token to peers
   * @param {Object} token 
   */
  syncToken(token) {
    this.broadcast({
      type: 'token-sync',
      token,
      timestamp: Date.now()
    });
  }

  /**
   * Sync login state to peers
   * @param {Object} loginData 
   */
  syncLogin(loginData) {
    this.broadcast({
      type: 'login-sync',
      loginData,
      timestamp: Date.now()
    });
  }

  /**
   * Generate unique peer ID
   * @returns {string}
   */
  generatePeerId() {
    return 'peer_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Get list of connected peers
   * @returns {Array}
   */
  getConnectedPeers() {
    return Array.from(this.peers.keys());
  }

  /**
   * Disconnect from all peers
   */
  disconnect() {
    for (const [peerId, peer] of this.peers.entries()) {
      if (peer.dataChannel) {
        peer.dataChannel.close();
      }
      if (peer.pc) {
        peer.pc.close();
      }
    }
    
    this.peers.clear();
    
    if (this.signalingConnection) {
      // In production: this.signalingConnection.close();
      this.signalingConnection = null;
    }
    
    console.log('[P2P] Disconnected from all peers');
  }
}

export default P2PSyncManager;
