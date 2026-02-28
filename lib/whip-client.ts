/**
 * WHIP (WebRTC-HTTP Ingestion Protocol) client for Cloudflare Stream
 * Sends a browser MediaStream to Cloudflare Stream via WebRTC
 */

async function waitToCompleteICEGathering(pc: RTCPeerConnection): Promise<RTCSessionDescription | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(pc.localDescription), 2000);
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        resolve(pc.localDescription);
      }
    };
  });
}

async function negotiateWithEndpoint(pc: RTCPeerConnection, endpoint: string): Promise<string | null> {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const localDesc = await waitToCompleteICEGathering(pc);
  if (!localDesc) {
    throw new Error('Failed to gather ICE candidates');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    mode: 'cors',
    headers: { 'content-type': 'application/sdp' },
    body: localDesc.sdp,
  });

  if (response.status === 201) {
    const answerSDP = await response.text();
    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp: answerSDP })
    );
    return response.headers.get('Location');
  }

  const errorText = await response.text();
  throw new Error(`WHIP negotiate failed (${response.status}): ${errorText}`);
}

export class WHIPClient {
  private pc: RTCPeerConnection;
  private endpoint: string;
  private resourceUrl: string | null = null;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
      bundlePolicy: 'max-bundle',
    });
  }

  /**
   * Start publishing a MediaStream to Cloudflare Stream
   */
  async publish(stream: MediaStream): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pc.addEventListener('negotiationneeded', async () => {
        try {
          this.resourceUrl = await negotiateWithEndpoint(this.pc, this.endpoint);
          resolve();
        } catch (err) {
          reject(err);
        }
      }, { once: true });

      // Add all tracks as sendonly
      if (stream.getAudioTracks().length === 0) {
        console.warn('WHIPClient: No audio tracks in stream — broadcasting without audio');
      }
      stream.getTracks().forEach((track) => {
        this.pc.addTransceiver(track, { direction: 'sendonly' });
      });
    });
  }

  /**
   * Get current connection state
   */
  get connectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  /**
   * Listen for connection state changes
   */
  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.pc.addEventListener('connectionstatechange', () => {
      callback(this.pc.connectionState);
    });
  }

  /**
   * Stop publishing and clean up
   */
  async disconnect(): Promise<void> {
    // Signal server to stop
    if (this.resourceUrl) {
      try {
        await fetch(this.resourceUrl, { method: 'DELETE', mode: 'cors' });
      } catch {
        // Ignore cleanup errors
      }
    }
    this.pc.close();
  }
}
