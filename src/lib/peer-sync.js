/**
 * PeerSync - WebRTC DataChannel shim for P2P token/wallet synchronization
 * Configurable signaling URL and TURN settings
 */

import { encrypt, decrypt, generateECDHKeyPair, exportPublicKey, importPublicKey, deriveSharedSecret } from './crypto-helpers.js';

class PeerSync {
  constructor(config = {}) {
    this.config = {
      signalingUrl: config.signalingUrl || 'ws://localhost:8080',
      iceServers: config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' }
      ],
      encryptionEnabled: config.encryptionEnabled !== false,
      autoConnect: config.autoConnect !== false
    };
    
    this.peers = new Map();
    this.signalingConnection = null;
    this.localKeyPair = null;
    this.sharedSecrets = new Map();
    this.listeners = new Map();
    this.enabled = false;
  }

  /**
   * Initialize P2P sync
   */
  async init() {
    if (this.enabled) {
      console.log('[PeerSync] Already initialized');
      return;
    }
    
    console.log('[PeerSync] Initializing...');
    
    // Generate ECDH key pair for encryption
    if (this.config.encryptionEnabled) {
      try {
        this.localKeyPair = await generateECDHKeyPair();
        console.log('[PeerSync] Encryption enabled');
      } catch (error) {
        console.warn('[PeerSync] Encryption setup failed, continuing without encryption', error);
        this.config.encryptionEnabled = false;
      }
    }
    
    this.enabled = true;
    
    if (this.config.autoConnect) {
      // Note: Actual WebRTC connection would require a signaling server
      console.log('[PeerSync] Auto-connect enabled (signaling server required)');
    }
  }

  /**
   * Connect to signaling server
   */
  async connectSignaling() {
    if (typeof WebSocket === 'undefined') {
      throw new Error('WebSocket not available');
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.signalingConnection = new WebSocket(this.config.signalingUrl);
        
        this.signalingConnection.onopen = () => {
          console.log('[PeerSync] Connected to signaling server');
          resolve();
        };
        
        this.signalingConnection.onerror = (error) => {
          console.error('[PeerSync] Signaling connection error:', error);
          reject(error);
        };
        
        this.signalingConnection.onmessage = (event) => {
          this._handleSignalingMessage(JSON.parse(event.data));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create peer connection
   */
  async createPeerConnection(peerId) {
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC not available');
    }
    
    const peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers
    });
    
    // Create data channel
    const dataChannel = peerConnection.createDataChannel('pewpi-sync', {
      ordered: true
    });
    
    this._setupDataChannel(dataChannel, peerId);
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this._sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: peerId
        });
      }
    };
    
    this.peers.set(peerId, {
      connection: peerConnection,
      dataChannel
    });
    
    return peerConnection;
  }

  /**
   * Setup data channel event handlers
   */
  _setupDataChannel(dataChannel, peerId) {
    dataChannel.onopen = () => {
      console.log(`[PeerSync] Data channel opened with peer ${peerId}`);
      this._emitEvent('peer.connected', { peerId });
    };
    
    dataChannel.onclose = () => {
      console.log(`[PeerSync] Data channel closed with peer ${peerId}`);
      this._emitEvent('peer.disconnected', { peerId });
    };
    
    dataChannel.onerror = (error) => {
      console.error(`[PeerSync] Data channel error with peer ${peerId}:`, error);
      this._emitEvent('peer.error', { peerId, error });
    };
    
    dataChannel.onmessage = async (event) => {
      await this._handlePeerMessage(event.data, peerId);
    };
  }

  /**
   * Send data to peer
   */
  async sendToPeer(peerId, data) {
    const peer = this.peers.get(peerId);
    if (!peer || peer.dataChannel.readyState !== 'open') {
      throw new Error(`Peer ${peerId} not connected`);
    }
    
    let messageData = data;
    
    // Encrypt if enabled
    if (this.config.encryptionEnabled) {
      const sharedSecret = this.sharedSecrets.get(peerId);
      if (sharedSecret) {
        const encrypted = await encrypt(JSON.stringify(data), sharedSecret);
        messageData = { encrypted: true, data: encrypted };
      }
    }
    
    peer.dataChannel.send(JSON.stringify(messageData));
  }

  /**
   * Broadcast data to all connected peers
   */
  async broadcast(data) {
    const promises = [];
    for (const peerId of this.peers.keys()) {
      promises.push(this.sendToPeer(peerId, data).catch(err => {
        console.error(`[PeerSync] Error broadcasting to ${peerId}:`, err);
      }));
    }
    await Promise.all(promises);
  }

  /**
   * Handle incoming peer message
   */
  async _handlePeerMessage(messageStr, peerId) {
    try {
      let message = JSON.parse(messageStr);
      
      // Decrypt if encrypted
      if (message.encrypted && this.config.encryptionEnabled) {
        const sharedSecret = this.sharedSecrets.get(peerId);
        if (sharedSecret) {
          const decrypted = await decrypt(message.data, sharedSecret);
          message = JSON.parse(decrypted);
        }
      }
      
      // Emit message event
      this._emitEvent('peer.message', { peerId, data: message });
      
      // Handle specific message types
      if (message.type === 'token.created') {
        this._emitEvent('pewpi.token.created', message.token);
      } else if (message.type === 'token.updated') {
        this._emitEvent('pewpi.token.updated', message.token);
      }
    } catch (error) {
      console.error('[PeerSync] Error handling peer message:', error);
    }
  }

  /**
   * Handle signaling message
   */
  async _handleSignalingMessage(message) {
    console.log('[PeerSync] Signaling message:', message.type);
    
    // Handle different signaling message types
    // This is a stub - actual implementation would handle offers, answers, ICE candidates, etc.
  }

  /**
   * Send signaling message
   */
  _sendSignalingMessage(message) {
    if (this.signalingConnection && this.signalingConnection.readyState === WebSocket.OPEN) {
      this.signalingConnection.send(JSON.stringify(message));
    }
  }

  /**
   * Subscribe to events
   */
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
    
    return () => {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit event
   */
  _emitEvent(eventType, data) {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error('[PeerSync] Error in event callback:', error);
      }
    });
    
    // Also emit to window
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    }
  }

  /**
   * Disconnect from all peers
   */
  disconnect() {
    for (const [peerId, peer] of this.peers.entries()) {
      if (peer.dataChannel) {
        peer.dataChannel.close();
      }
      if (peer.connection) {
        peer.connection.close();
      }
    }
    
    this.peers.clear();
    this.sharedSecrets.clear();
    
    if (this.signalingConnection) {
      this.signalingConnection.close();
      this.signalingConnection = null;
    }
    
    this.enabled = false;
    console.log('[PeerSync] Disconnected');
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      connectedPeers: this.peers.size,
      encryptionEnabled: this.config.encryptionEnabled,
      signalingConnected: this.signalingConnection && this.signalingConnection.readyState === WebSocket.OPEN
    };
  }
}

export default PeerSync;
